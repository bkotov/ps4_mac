# Override PS4 BDADDR in DualShock 4 Controller

This script allows you to read and override the PS4 BDADDR (Bluetooth Device Address) inside a DualShock 4 controller using Node.js. It communicates with the controller over USB to perform read and write operations on specific reports.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Notes](#notes)

## Prerequisites

- **Node.js**: Ensure you have Node.js installed (version 12 or higher is recommended).
- **USB Permissions**:
  - **Windows**: You may need to install a filter driver (e.g., using [Zadig](https://zadig.akeo.ie/)) to allow user-space applications to access the DualShock 4 controller.
  - **Linux**: You might need to run the script with `sudo` or set up udev rules to grant appropriate permissions.
  - **macOS**: Administrative privileges may be required.

## Installation

1. **Clone the Repository** (or download the script)

    ```bash
    git clone [https://github.com/bkotov/ps4_mac.git](https://github.com/bkotov/ps4_mac)
    cd ps4_mac
    ```

2.	**Install Dependencies**

    ```bash
    npm install
    ```

## Usage

  ```bash
  node index.js [options]
  ```

The script provides three options, but only one can be used at a time:

- -h: Display help information.
- -r: Read the current PS4 MAC address from the controller.
- -w <ADDR>: Write a new PS4 MAC address to the controller.

## Notes

-	**Controller Connection**: Ensure your DualShock 4 controller is connected via USB and recognized by your system.
-	**Vendor and Product IDs**:
    - The script uses Vendor ID 0x054C (Sony Corporation) and Product ID 0x09CC (DualShock 4 CUH-ZCT2 model).
    -	If your controller has a different Product ID (e.g., 0x05C4 for earlier models), update the PRODUCT_ID constant in  the script accordingly:

      ```javascript
      const PRODUCT_ID = 0x05C4; // Use this if your controller has Product ID 0x05C4
      ```
