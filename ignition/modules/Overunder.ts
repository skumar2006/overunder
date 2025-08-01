// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const OverUnderModule = buildModule("OverUnderModule", (m) => {
  // Deploy Treasury first
  const treasury = m.contract("Treasury", []);

  // Deploy OverUnder main contract with Treasury address
  const overUnder = m.contract("Overunder", [treasury]);

  return { treasury, overUnder };
});

export default OverUnderModule;  
