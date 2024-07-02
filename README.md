# Totalsig-Recovery

## NB! This tool will grant exclusive control over the wallet account once the original private key is recovered. This means a single entity will have the ability to manage the wallet and spend its funds without requiring approval from other parties.

## Description

`totalsig-recovery` is a tool designed to recover private key of wallets created using TotalSig in case of disaster. It reads seed files, derives keys, decrypts wallet backups, and reconstructs secrets to recover wallets.

## How it Works

1. **Find Seed Files**: The script scans the current directory for seed files.

2. **Decrypt Backup Files**: It reads corresponding backup files (if available) and decrypts them using the derived private keys.

3. **Reconstruct Secrets**: The script reconstructs the secrets required to recover the wallets.

4. **Output Results**: The script outputs the recovered wallets and their corresponding private keys into `keys.txt` file.

## Using Compiled Binaries

1. **Download the Compiled Binary**:
    - Obtain the appropriate binary for your operating system from this repository.

2. **Prepare Seed and Backup Files**:
    - Place your seed files in the same directory as the binary. Seed files should follow the naming structure `ACCOUNT_NAME-seed.txt`, where _ACCOUNT_NAME_ represents the tagged account.
    - Place your backup files in the same directory as well. Backup files should follow the naming structure `ACCOUNT_NAME-backups.txt`, where _ACCOUNT_NAME_ matches the corresponding seed file name.
    - Example of directory structure

        ```
        totalsig-recovery/
        ├── totalsig-recovery.exe
        ├── account1-seed.txt
        ├── account1-backups.txt
        ├── account2-seed.txt
        ├── account2-backups.txt
        ├── account3-seed.txt
        ├── account3-backups.txt
        └── keys.txt
        ```

The software will process seeds and backups to recover wallets.

3. **Run the Binary**:
    - **On Linux/Mac**:
        - Open a terminal.
        - Navigate to the directory containing the binary and your seed/backup files.
        - Run the binary using the command:

            ```sh
            ./totalsig-recovery
            ```

    - **On Windows**:
        - Open a file explorer.
        - Navigate to the directory containing the binary and your seed/backup files.
        - Run the binary using the command:

            ```sh
            totalsig-recovery.exe
            ```

    - The binary will process `ACCOUNT_NAME-seed.txt` and `ACCOUNT_NAME-backups.txt` to recover private keys.

## Using the Script as a Node.js Script

If you prefer or need to run the script using Node.js, follow these steps:

1. **Clone the Repository**.

2. **Navigate to the Project Directory**:

    ```sh
    cd totalsig-recovery
    ```

3. **Install the Necessary Dependencies Using NPM**:

    ```sh
    npm install
    ```

4. **Prepare Seed and Backup Files**:

5. **Run the Script**:

    ```sh
    npm start
    ```

## Building binaries

If you prefer you can build your own binaries:

```sh
pkg . --targets node14-linux-x64,node14-macos-x64,node14-win-x64
```

## File Structure

- `keyRecovery.js`: Main script for recovering keys.
- `shamir.js`: Contains the ShamirSecretSharing class for handling secret sharing.
- `package.json`: Contains project metadata and dependencies.

## Private Key Export Limitations

Note about Solana:
Due to the structure of private keys in ed25519-based blockchains, while the actual private key can be recovered, it is exported in a format that is largely unsupported by other wallet providers. You can still sign transactions using this private key, which will be validated by the corresponding network. However, at the moment, this requires writing a custom script for compiling and signing such transactions. We are working to resolve this limitation in the near future.

## Troubleshooting

- Ensure all dependencies are installed correctly if using the Node.js script.
- Verify the naming structure of the seed and backup files.
- Check for any errors in the console output and ensure the seed files contain valid mnemonic phrases.
