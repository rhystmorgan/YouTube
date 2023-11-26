import {
  Blockfrost,
  C,
  Data,
  Lucid,
  SpendingValidator,
  TxHash,
  fromHex,
  toHex,
  toUnit,
  Constr,
  MintingPolicy,
  fromText,
  mintingPolicyToId,
  applyParamsToScript,
  applyDoubleCborEncoding,
  attachSpendingValidator,
  UTxO,
} from "https://deno.land/x/lucid@0.10.6/mod.ts";
import * as cbor from "https://deno.land/x/cbor@v1.4.1/index.js";

// deno run --allow-net --allow-read --allow-env lucidInit.ts

// check the order of your validators in the './plutus.json' file 
// after you have built the project

const BLOCKFROST = "API_KEY"
 
const lucid = await Lucid.new(
  new Blockfrost(
    "https://cardano-preview.blockfrost.io/api/v0",
    BLOCKFROST,
  ),
  "Preview",
);
 
lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./owner.sk"));
// lucid.selectWalletFromPrivateKey(await Deno.readTextFile("./beneficiary.sk"));
 
const ownerPKH = lucid.utils.getAddressDetails(await Deno.readTextFile("owner.addr"))
.paymentCredential.hash;

const mint = await readMintValidator()
const mintCS = lucid.utils.mintingPolicyToId(mint)
const lock = await readLockValidator()
const distro = await readDistroValidator()

// Apply Parameters To Validators //

async function readDistroValidator(): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
  return {
    type: "PlutusV2",
    script: applyParamsToScript(applyDoubleCborEncoding(validator.compiledCode), [ownerPKH]),
  };
}

async function readLockValidator(): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[1];
  return {
    type: "PlutusV2",
    script: applyParamsToScript(applyDoubleCborEncoding(validator.compiledCode), [ownerPKH, mintCS]),
  };
}

async function readMintValidator(): Promise<MintingPolicy> {
  const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[2];
  return {
    type: "PlutusV2",
    script: applyParamsToScript(applyDoubleCborEncoding(validator.compiledCode), [ownerPKH]),
  };
}

const ownerAddress = await Deno.readTextFile("./owner.addr");

const beneficiaryPublicKeyHash =
  lucid.utils.getAddressDetails(await Deno.readTextFile("beneficiary.addr"))
.paymentCredential.hash;

const beneficiaryAddress = await Deno.readTextFile("./beneficiary.addr");

// Datums & Redeemers //

const tokenName = fromText("FTOIC01")

const redeemer = Data.to(new Constr(0, [BigInt(1), BigInt(0)]))
const mintRedeemer = Data.to(new Constr(0, [BigInt(1), BigInt(1000), tokenName]))

const lDatum = Data.to(new Constr(0, [BigInt(420)]))
const dDatum = Data.to(new Constr(0, [BigInt(420)])) 

const lAddress = lucid.utils.validatorToAddress(lock) 
const dAddress = lucid.utils.validatorToAddress(distro)

// Transaction Execution //

// const splitUtxo = await splitUtxos() // only do this if you need to free up UTxOs

// await lucid.awaitTx(splitUtxo)

// console.log(`Transactions Split!
//     Tx Hash: ${splitUtxo}
// `)

const mintToken = await mintTokens()

await lucid.awaitTx(mintToken)

console.log(`Minted Fractionalised NFT!
    Tx Hash: ${mintToken}
    PolicyID : ${mintCS}
`)

const distroToken = await distroTokens()

await lucid.awaitTx(distroToken)

console.log(`Distributed Token!
    Tx Hash: ${distroToken}
`)

const updateToken = await updateTokens()

await lucid.awaitTx(updateToken)

console.log(`Updated NFT!
    Tx Hash: ${updateToken}
`)
 
// Transactions //

async function mintTokens() {
  const tx = await lucid
    .newTx()
    .mintAssets({
      [toUnit(mintCS, tokenName, 100)]: BigInt(1),
      [toUnit(mintCS, tokenName, 444)]: BigInt(1000)
    }, mintRedeemer)
    .attachMintingPolicy(mint)
    .payToContract(lAddress, { inline: lDatum }, { [toUnit(mintCS, tokenName, 100)]: BigInt(1)})
    .payToContract(dAddress, { inline: dDatum }, { [toUnit(mintCS, tokenName, 444)]: BigInt(1000)})
    .addSignerKey(ownerPKH)
    .complete()

  const signedTx = await tx.sign().complete()

  return signedTx.submit()
}

async function distroTokens() {
  const unit = toUnit(mintCS, tokenName, 444)
  const utxos: [UTxO] = await lucid.utxosAtWithUnit(dAddress, [unit])
  const utxo: UTxO = utxos[0]
  const value = await utxo.assets[unit]
  const outValue = value - 1n

  console.log(value)

  const tx = await lucid
    .newTx()
    .collectFrom([utxo], redeemer) 
    .attachSpendingValidator(distro) 
    .payToAddress(beneficiaryAddress, { [unit]: 1n } ) 
    .payToContract(dAddress, dDatum, { [unit]: outValue} ) 
    .complete()

  const signedTx = await tx.sign().complete()

  return signedTx.submit()
}

async function updateTokens() {
  const unit = toUnit(mintCS, tokenName, 100)
  const utxos = await lucid.utxosAtWithUnit(lAddress, [unit])
  const utxo = utxos[0]
  console.log(utxo)
  const lDatum2 = Data.to(new Constr(0, [BigInt(69420)]))

  const tx = await lucid
    .newTx()
    .collectFrom([utxo], redeemer) 
    .attachSpendingValidator(lock) 
    .payToContract(lAddress, { inline: lDatum2 }, { [unit]: BigInt(1) }) 
    .addSignerKey(ownerPKH)
    .complete()

  const signedTx = await tx.sign().complete()

  return signedTx.submit()
}

// Split UTxOs // 
// Do this after you use the testnet faucet,
// to create more utxos at your wallet

async function splitUtxos() {
  const tx = await lucid
    .newTx()
    .payToAddress(ownerAddress, {lovelace: 100000000n})
    .payToAddress(ownerAddress, {lovelace: 100000000n})
    .payToAddress(ownerAddress, {lovelace: 100000000n})
    .payToAddress(ownerAddress, {lovelace: 100000000n})
    .payToAddress(ownerAddress, {lovelace: 100000000n})
    .complete()

  const signedTx = await tx.sign().complete()

  return signedTx.submit()
}
