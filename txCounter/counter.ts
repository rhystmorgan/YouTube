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

// deno run --allow-net --allow-read --allow-env counter.ts

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

const ownerPKH = lucid.utils.getAddressDetails(await Deno.readTextFile("owner.addr"))
.paymentCredential.hash;

const cmint = await readCountMint()
const countCS = lucid.utils.mintingPolicyToId(cmint)
const cval = await readCountValidator()
const distro = await readDistroValidator()

// --- Supporting functions

async function readCountMint(): Promise<MintingPolicy> {
  const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[0];
  return {
    type: "PlutusV2",
    script: applyParamsToScript(applyDoubleCborEncoding(validator.compiledCode), [ownerPKH]),
  };
}

async function readCountValidator(): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[1];
  return {
    type: "PlutusV2",
    script: applyParamsToScript(applyDoubleCborEncoding(validator.compiledCode), [ownerPKH, countCS]),
  };
}

async function readDistroValidator(): Promise<SpendingValidator> {
  const validator = JSON.parse(await Deno.readTextFile("plutus.json")).validators[2];
  return {
    type: "PlutusV2",
    script: applyParamsToScript(applyDoubleCborEncoding(validator.compiledCode), [ownerPKH, countCS]),
  };
}

const ownerAddress = await Deno.readTextFile("./owner.addr");

const beneficiaryPublicKeyHash =
  lucid.utils.getAddressDetails(await Deno.readTextFile("beneficiary.addr"))
.paymentCredential.hash;

const beneficiaryAddress = await Deno.readTextFile("./beneficiary.addr");

// --- Validator Details

const redeemer = Data.to(new Constr(0, [1n]))
const mintRedeemer = Data.to(new Constr(0, [1n]))
const burnRedeemer = Data.to(new Constr(0, [2n]))

const cAddress = lucid.utils.validatorToAddress(cval)
const cDatum = Data.to(new Constr(0, [0n]))

const dAddress = lucid.utils.validatorToAddress(distro)
const dDatum = Data.to(new Constr(0, [1n]))

const tokenName = fromText("Salsa")
const unit = toUnit(countCS, tokenName)

// --- Transaction Execution

const splitUtxo = await splitUtxos()

await lucid.awaitTx(splitUtxo)

console.log(`Transactions Split!
    Tx Hash: ${splitUtxo}
`)
 
const mintCounter = await mintCount()

await lucid.awaitTx(mintCounter)

console.log(`Minted Counter!
    Tx Hash: ${mintCounter}
    PolicyId: ${countCS}
`)

const incCount = await incDatum()

await lucid.awaitTx(incCount)

console.log(`Datum Inc'd!
    Tx Hash: ${incCount}
    PolicyId: ${countCS}
`)

const deposit = await makeDeposit()

await lucid.awaitTx(deposit)

console.log(`Deposit Made!
    Tx Hash: ${deposit}
`)

const withd = await makeWithd()

await lucid.awaitTx(withd)

console.log(`Withdrawal Made!
    Tx Hash: ${withd}
`)

const burnCount = await burnCounter()

await lucid.awaitTx(burnCount)

console.log(`Burned Counter!
    Tx Hash: ${burnCount}
    PolicyId: ${countCS}
`)

// --- Transactions

async function makeDeposit() {
  const utxos = await lucid.wallet.getUtxos()

  const tx = await lucid
    .newTx()
    .collectFrom(utxos)
    .payToContract(dAddress, { inline: dDatum }, { lovelace: 100000000n})
    .complete()

    const signedTx = await tx.sign().complete()

    return signedTx.submit()
}

async function makeWithd() { 
  const cutxos: [UTxO] = await lucid.utxosAtWithUnit(cAddress, [unit])
  const cutxo: UTxO = cutxos[0]
  const utxos: [UTxO] = await lucid.utxosAt(dAddress)
  const datum = await Data.from(cutxo.datum)
  const count = datum.fields[0]
  const outCount = count + 1n 
  const cDatum2 = Data.to(new Constr(0, [outCount]))

  console.log(outCount)

  const tx = await lucid
    .newTx()
    .collectFrom([cutxo], redeemer)
    .collectFrom(utxos, redeemer)
    .attachSpendingValidator(cval)
    .attachSpendingValidator(distro)
    .payToContract(cAddress, { inline: cDatum2 }, { [unit]: 1n })
    .payToAddress(beneficiaryAddress, { lovelace: 100000000n })
    .complete()

    const signedTx = await tx.sign().complete()

    return signedTx.submit()
}

async function mintCount() {
  const tx = await lucid 
    .newTx()
    .mintAssets({[unit]: 1n}, mintRedeemer)
    .attachMintingPolicy(cmint)
    .payToContract(cAddress, {inline: cDatum}, {[unit]: 1n})
    .addSignerKey(ownerPKH)
    .complete()

    const signedTx = await tx.sign().complete()

    return signedTx.submit()
}

async function incDatum() {
  const cutxos: [UTxO] = await lucid.utxosAtWithUnit(cAddress, [unit])
  const cutxo: UTxO = cutxos[0]
  const datum = await Data.from(cutxo.datum)
  const count = datum.fields[0]
  const outCount = count + 1n 
  const cDatum2 = Data.to(new Constr(0, [outCount]))
  console.log(outCount)

  const tx = await lucid 
    .newTx()
    .collectFrom([cutxo], redeemer)
    .attachSpendingValidator(cval)
    .payToContract(cAddress, { inline: cDatum2 }, { [unit]: 1n })
    .complete()

    const signedTx = await tx.sign().complete()

    return signedTx.submit()
}

async function burnCounter() {
  const cutxos: [UTxO] = await lucid.utxosAtWithUnit(cAddress, [unit])
  const cutxo: UTxO = cutxos[0]
  console.log(cAddress)

  const tx = await lucid 
    .newTx()
    .collectFrom([cutxo], burnRedeemer)
    .mintAssets({[unit]: -1n}, burnRedeemer)
    .attachMintingPolicy(cmint)
    .attachSpendingValidator(cval)
    .addSignerKey(ownerPKH)
    .complete()

    const signedTx = await tx.sign().complete()

    return signedTx.submit()
}

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