use aiken/bytearray
use aiken/dict
use aiken/hash.{Blake2b_224, Hash}
use aiken/list
use aiken/transaction.{InlineDatum, Mint, ScriptContext, Spend, Transaction}
use aiken/transaction/credential.{VerificationKey}
use aiken/transaction/value
use frac/okapi as ok

// reference Prefix
const refPrefix = #"000643b0"

// fraction Prefix
const fracPrefix = #"001bc280"

// PKH 
type VerificationKeyHash =
  Hash<Blake2b_224, VerificationKey>

// Helper Functions //
fn make_token_names(tn) -> List<value.AssetName> {
  let tokenName: value.AssetName = tn
  let refTn = tokenName
  let fracTn = tokenName
  [refTn, fracTn]
}

fn fraction_token_prefix(tn) {
  let token_names = make_token_names(tn)
  let token_name_prefix =
    [refPrefix, fracPrefix]
  list.map2(token_name_prefix, token_names, fn(a, b) { bytearray.concat(a, b) })
}

fn compare_token_names(an: value.AssetName, tn: Option<ByteArray>) -> Bool {
  expect Some(tn) = tn
  an == tn
}

fn tx_signed_by(tx: Transaction, pkh: VerificationKeyHash) {
  list.has(tx.extra_signatories, pkh)
}

//                      //
// Token Minting Policy //
//                      //

type MintAction {
  a: Int,
  b: Int,
  tn: ByteArray,
}

type TokenDatum {
  a: Int,
}

// type TokenDatum {
//   name: ByteArray,
//   image: ByteArray,
//   mediaType: ByteArray,
// }

validator(owner: VerificationKeyHash) {
  fn mint(r: MintAction, c: ScriptContext) -> Bool {
    let ScriptContext { transaction, purpose } = c
    expect Mint(policy_id) = purpose

    let Transaction { mint, outputs, .. } = transaction

    expect [(ref_asset_name, ref_amount), (frac_asset_name, frac_amount)] =
      mint
        |> value.from_minted_value
        |> value.tokens(policy_id)
        |> dict.to_list()

    expect tx_signed_by(transaction, owner)
    when r.a is {
      1 -> {
        expect
          list.any(
            outputs,
            fn(output) {
              expect InlineDatum(datum) = output.datum
              expect datum: TokenDatum = datum
              value.quantity_of(output.value, policy_id, ref_asset_name) == 1
            },
          )
        expect
          list.any(
            outputs,
            fn(output) {
              value.quantity_of(output.value, policy_id, frac_asset_name) == r.b
            },
          )
        let token_name_list = fraction_token_prefix(r.tn)
        let ref_tn_check =
          compare_token_names(ref_asset_name, list.at(token_name_list, 0))
        let frac_tn_check =
          compare_token_names(frac_asset_name, list.at(token_name_list, 1))
        ref_amount == 1 && frac_amount == r.b && ref_tn_check && frac_tn_check
      }
      _ -> {
        let token_name_list = fraction_token_prefix(r.tn)
        let ref_tn_check =
          compare_token_names(ref_asset_name, list.at(token_name_list, 0))
        let frac_tn_check =
          compare_token_names(frac_asset_name, list.at(token_name_list, 1))

        ref_amount == -1 && frac_amount == -r.b && ref_tn_check && frac_tn_check
      }
    }
  }
}

//                             //
// Ref Token Locking Validator //
//                             //

type LockAction {
  a: Int,
  b: Int,
}

validator(owner: VerificationKeyHash, cs: value.PolicyId) {
  fn lock(d: TokenDatum, r: LockAction, c: ScriptContext) -> Bool {
    when r.a is {
      1 -> {
        let out = ok.get_own_singleton_output(c)
        ok.contains_single_token_of(out.value, cs) && tx_signed_by(
          c.transaction,
          owner,
        )
      }
      // tx signed by owner
      // output contains single token (policyID)
      _ -> tx_signed_by(c.transaction, owner)
    }
    // tx signed by owner
  }
}

//                        //
// Distribution Validator //
//                        //

type DisAction {
  a: Int,
  b: Int,
}

type DisDatum {
  a: Int,
}

validator(owner: VerificationKeyHash) {
  fn distro(d: DisDatum, r: DisAction, c: ScriptContext) -> Bool {
    when r.a is {
      1 -> {
        let out = ok.get_own_singleton_output(c)
        let in = ok.get_own_input(c)

        ok.has_one_singleton_asset_less(in.value, out.value)
      }
      _ -> tx_signed_by(c.transaction, owner)
    }
  }
}
