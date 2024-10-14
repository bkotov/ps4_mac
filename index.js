const usb = require('usb');
const process = require('process');

// Vendor and Product IDs for the DualShock 4 controller
const VENDOR_ID = 0x054C;  // Sony Corporation
const PRODUCT_ID = 0x09CC; // DualShock 4 (CUH-ZCT2). Update if your controller has a different ID.

/**
 * Parses a MAC address string and returns an array of bytes in reverse order.
 * @param {string} macString - The MAC address string to parse.
 * @returns {number[]} - Array of MAC address bytes in reverse order.
 * @throws Will throw an error if the MAC address format is invalid.
 */
function parseMacAddress(macString) {
  const cleaned = macString.replace(/[-:]/g, '');
  if (cleaned.length !== 12) {
    throw new Error('Invalid MAC address format');
  }
  const macBytes = [];
  for (let i = 0; i < 12; i += 2) {
    macBytes.push(parseInt(cleaned.substr(i, 2), 16));
  }
  // Reverse the array to match the required byte order for the controller
  return macBytes.reverse();
}

/**
 * Formats an array of bytes into a MAC address string.
 * @param {number[]} bytes - Array of bytes representing a MAC address.
 * @returns {string} - Formatted MAC address string.
 */
function formatMacAddress(bytes) {
  return bytes
    .map((b) => ('0' + b.toString(16).toUpperCase()).slice(-2))
    .join(':');
}

/**
 * Prints the help message with usage and options.
 */
function printHelp() {
  console.log('Override the PS4 BDADDR inside a DualShock 4 controller.');
  console.log('');
  console.log('Usage: node index.js [options]');
  console.log('');
  console.log('Options:');
  console.log('  -h          Display this help message.');
  console.log('  -w <ADDR>   Set the PS4\'s BDADDR (MAC address).');
  console.log('              Acceptable formats: 00:11:22:33:44:55, 00-11-22-33-44-55 or 001122334455.');
  console.log('  -r          Read the current PS4 MAC address from the controller.');
}

/**
 * Parses command-line arguments.
 * @returns {Object} - An object containing parsed options.
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let options = {
    mac: null,
    needRead: false,
  };

  if (args.length === 0) {
    console.error('Error: No arguments provided.');
    printHelp();
    process.exit(1);
  }

  // Ensure only one option is provided
  if (args.length > 2 || (args[0] !== '-w' && args.length > 1)) {
    console.error('Error: Only one option is allowed.');
    printHelp();
    process.exit(1);
  }

  const arg = args[0];

  if (arg === '-h') {
    // '-h' should not have any additional arguments
    if (args.length > 1) {
      console.error('Error: The -h option does not take any arguments.');
      printHelp();
      process.exit(1);
    }
    printHelp();
    process.exit(0);
  } else if (arg === '-r') {
    // '-r' should not have any additional arguments
    if (args.length > 1) {
      console.error('Error: The -r option does not take any arguments.');
      printHelp();
      process.exit(1);
    }
    options.needRead = true;
  } else if (arg === '-w') {
    // '-w' must be followed by a MAC address
    if (args.length !== 2) {
      console.error('Error: The -w option requires a MAC address as an argument.');
      printHelp();
      process.exit(1);
    }
    options.mac = args[1];
  } else {
    console.error('Unknown argument:', arg);
    printHelp();
    process.exit(1);
  }

  return options;
}

/**
 * Performs a USB control transfer asynchronously.
 * @param {Object} device - The USB device.
 * @param {number} bmRequestType - The request type.
 * @param {number} bRequest - The request.
 * @param {number} wValue - The value field.
 * @param {number} wIndex - The index field.
 * @param {Buffer|number} data_or_length - Data to send or the length of data to receive.
 * @returns {Promise<Buffer>} - A promise that resolves to the data received.
 */
function controlTransferAsync(device, bmRequestType, bRequest, wValue, wIndex, data_or_length) {
  return new Promise((resolve, reject) => {
    device.controlTransfer(
      bmRequestType,
      bRequest,
      wValue,
      wIndex,
      data_or_length,
      function (error, data) {
        if (error) {
          reject(error);
        } else {
          resolve(data);
        }
      }
    );
  });
}

/**
 * Reads the PS4 MAC address from the controller.
 * @param {Object} dev - The USB device representing the controller.
 */
async function readMacAddress(dev) {
  // Control transfer parameters for reading report 0x12
  const bmRequestType = 0xA1; // USB_DIR_IN | USB_TYPE_CLASS | USB_RECIP_INTERFACE
  const bRequest = 0x01;      // GET_REPORT
  const wValue = 0x0312;      // Report Type (0x03) and Report ID (0x12)
  const wIndex = 0x0000;      // Interface number
  const length = 0x10;        // Length of data to read (16 bytes)

  const data = await controlTransferAsync(
    dev,
    bmRequestType,
    bRequest,
    wValue,
    wIndex,
    length
  );

  // Extract UID and PS4 MAC address from the received data
  const uidBytes = [data[6], data[5], data[4], data[3], data[2], data[1]];
  const ps4MacBytes = [data[15], data[14], data[13], data[12], data[11], data[10]];
  const uid = formatMacAddress(uidBytes);
  const ps4Mac = formatMacAddress(ps4MacBytes);

  console.log('DualShock 4 UID:', uid);
  console.log('PlayStation 4 MAC Address:', ps4Mac);
}

/**
 * Writes a new PS4 MAC address to the controller.
 * @param {Object} dev - The USB device representing the controller.
 * @param {number[]} macBytes - Array of MAC address bytes in reverse order.
 */
async function writeMacAddress(dev, macBytes) {
  // Control transfer parameters for writing report 0x13
  const bmRequestType = 0x21; // USB_DIR_OUT | USB_TYPE_CLASS | USB_RECIP_INTERFACE
  const bRequest = 0x09;      // SET_REPORT
  const wValue = 0x0313;      // Report Type (0x03) and Report ID (0x13)
  const wIndex = 0x0000;      // Interface number

  // Prepare the message buffer with the MAC address and other required bytes
  const msg = Buffer.from([
    0x13,         // Report ID
    ...macBytes,  // MAC address bytes in reverse order
    0x56, 0xE8, 0x81, 0x38, 0x08, 0x06, 0x51, 0x41,
    0xC0, 0x7F, 0x12, 0xAA, 0xD9, 0x66, 0x3C, 0xCE,
  ]);

  // Perform the control transfer to set the new MAC address
  await controlTransferAsync(dev, bmRequestType, bRequest, wValue, wIndex, msg);

  console.log('PS4 MAC address has been updated successfully.');
}

(async function main() {
  // Parse command-line arguments
  const options = parseArgs();
  const mac = options.mac;
  const needRead = options.needRead;

  // Parse and validate the MAC address if provided
  let macBytes = null;
  if (mac) {
    try {
      macBytes = parseMacAddress(mac);
    } catch (e) {
      console.error('Error parsing MAC address:', e.message);
      process.exit(1);
    }
  }

  // Find the USB device
  const dev = usb.findByIds(VENDOR_ID, PRODUCT_ID);
  if (!dev) {
    console.error('Unable to find DualShock 4 controller.');
    process.exit(1);
  }

  // Open the device
  dev.open();

  try {
    // Read the current MAC address if requested
    if (needRead) {
      await readMacAddress(dev);
    }

    // Write the new MAC address if provided
    if (macBytes) {
      await writeMacAddress(dev, macBytes);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    // Close the device
    dev.close();
  }
})();
