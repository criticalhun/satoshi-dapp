
!!!!This project was created solely as a personal learning exercise and not for any personal gain. As a Hungarian citizen, I am fully aware of the new Hungarian Criminal Code, which prohibits private individuals from developing decentralized applications (dApps). My sole purpose in building this is educational.!!!

Satoshi Standard dApp
Satoshi Standard is a decentralized, Bitcoin-backed token system that brings value-based money logic back to the modern DeFi world.

🌟 Key Features
BTC-backed: Every SATSTD token is fully backed by onchain or offchain Proof-of-Reserve BTC collateral.

Fully open source, transparent: All logic and transactions are auditable on-chain.

Role-based governance: Multiple roles (admin, minter, operator, pauser) provide advanced, secure contract management.

Pause/Unpause: The contract can be temporarily halted in case of critical bugs or attacks (emergency brake).

Onchain auditing, events: All important functions emit their own event (Minted, Burned, FeedChanged, etc.).

Mobile-ready, modern React dApp: Web3 and MetaMask integration, QR code support, dark/light mode, live Proof of Reserve feed.
🚀 What Makes Satoshi Standard Unique?
“A modern reimagining of the gold standard, with Bitcoin as collateral.”

Accessible, programmable, and truly hard money, bringing back value-backing to the monetary system.

Transparent: Anyone can verify that there is real BTC reserve backing the circulating tokens.

Decentralizable: Admin and key roles can be handed over to multisig or DAO governance.



🧩 Main Features
Mint (Token issuance)
Only possible with minter, admin, or operator role.

Only as many tokens can be minted as are backed by BTC, according to the live feed.

Burn (Token burning)
Only possible with burner, admin, or operator role.

Burned tokens release the corresponding BTC reserve.

Reserve Feed Change
Admin/operator can set a new Proof of Reserve feed address (e.g., Chainlink Aggregator or MockFeed).

Pause/Unpause
Any time, with a single transaction, the entire system (minting/burning) can be temporarily paused.

👩‍💻 Technology Stack
Smart contract: Solidity 0.8.x, OpenZeppelin AccessControl, ERC20, Pausable.

Frontend: React + ethers.js, Tailwind CSS, QRCode.

Dev tooling: Hardhat, Vercel (frontend deploy), GitHub Actions (build pipeline).

🛠️ Smart Contract - Key Roles
Role	Permissions
Admin	All functions, feed change, role management, pause/unpause
Operator	All admin functions, mint/burn, feed change, pause/unpause
Minter	Mint tokens
Pauser	Pause/unpause
Burner	Burn tokens

After deployment, all roles are assigned to the deployer. Roles can be transferred anytime!
🌐 Demo, Public Addresses
Sepolia Proof of Reserve Feed:
0xD3D2A1EdCBCab8308224C8CaeA8964d399B819D3

Main token contract address:
0xa86F8D5EE503e52bc8405A54E1C5f163d3D3eF8a

Live frontend demo:
https://satoshi-dapp-t9ne.vercel.app


📝 License
The project is for authorized use only; further development and forks require the express permission of the author!

🤝 Community & Contact
Email: criticalhun@proton.me

Twitter: @CriticalHUN
