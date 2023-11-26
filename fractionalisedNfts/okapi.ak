use aiken/bytearray
use aiken/dict
use aiken/hash.{Blake2b_224, Hash}
use aiken/list
use aiken/transaction.{
  Input, Output, OutputReference, ScriptContext, Spend, Transaction, find_input,
  find_script_outputs,
}
use aiken/transaction/credential.{Script, ScriptCredential, VerificationKey}
use aiken/transaction/value.{AssetName, PolicyId, Value}

// reference Prefix
pub const refPrefix = #"000643b0"

// fraction Prefix
pub const fracPrefix = #"001bc280"

// PKH 
pub type VerificationKeyHash =
  Hash<Blake2b_224, VerificationKey>

// Script Hash
pub type ScriptHash =
  Hash<Blake2b_224, Script>

// Helper Functions //
pub fn make_token_names(tn) -> List<AssetName> {
  let tokenName: AssetName = tn
  let refTn = tokenName
  let fracTn = tokenName
  [refTn, fracTn]
}

pub fn fraction_token_prefix(tn) {
  let token_names = make_token_names(tn)
  let token_name_prefix =
    [refPrefix, fracPrefix]
  list.map2(token_name_prefix, token_names, fn(a, b) { bytearray.concat(a, b) })
}

pub fn compare_token_names(an: AssetName, tn: Option<ByteArray>) -> Bool {
  expect Some(tn) = tn
  an == tn
}

pub fn tx_signed_by(tx: Transaction, pkh: VerificationKeyHash) {
  list.has(tx.extra_signatories, pkh)
}

pub fn get_own_input(ctx: ScriptContext) -> Output {
  let oref = get_spend_ref(ctx)

  expect Some(input) =
    ctx.transaction.inputs
      |> find_input(oref)

  let Input { .. } = input
  input.output
}

pub fn get_spend_ref(ctx: ScriptContext) -> OutputReference {
  expect Spend(ownRef) = ctx.purpose
  ownRef
}

pub fn contains_single_token_of(value: Value, policy_id: PolicyId) -> Bool {
  let token_count = dict.values(value.tokens(value, policy_id))
  token_count == [1]
}

pub fn get_own_singleton_output(ctx: ScriptContext) -> Output {
  let script_hash = get_own_script_hash(ctx)
  expect has_own_singleton_output(ctx)
  expect Some(output) =
    ctx.transaction.outputs
      |> find_script_outputs(script_hash)
      |> list.head()

  output
}

pub fn has_one_singleton_asset_less(in: Value, out: Value) -> Bool {
  expect Some(policy_id) =
    value.without_lovelace(in)
      |> value.policies()
      |> list.head()
  how_many_tokens(out, policy_id) == how_many_tokens(in, policy_id) - 1
}

pub fn how_many_tokens(v: Value, p: PolicyId) -> Int {
  expect Some(n) =
    value.tokens(v, p)
      |> dict.values()
      |> list.head()
  n
}

pub fn get_own_script_hash(ctx: ScriptContext) -> ScriptHash {
  let own_input = get_own_input(ctx)
  expect ScriptCredential(script_hash) = own_input.address.payment_credential
  script_hash
}

pub fn has_own_singleton_output(ctx: ScriptContext) -> Bool {
  let script_hash = get_own_script_hash(ctx)

  let script_outputs =
    ctx.transaction.outputs
      |> find_script_outputs(script_hash)

  list.length(script_outputs) == 1
}
