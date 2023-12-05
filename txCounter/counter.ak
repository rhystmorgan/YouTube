use aiken/dict.{to_list, values}
use aiken/hash.{Blake2b_224, Hash}
use aiken/list.{any, has, head}
use aiken/transaction.{
  InlineDatum, Input, Mint, ScriptContext, Spend, Transaction, find_input,
  find_script_outputs,
}
use aiken/transaction/credential.{ScriptCredential, VerificationKey}
use aiken/transaction/value.{
  PolicyId, from_minted_value, policies, quantity_of, tokens,
}

// PKH
type VerificationKeyHash =
  Hash<Blake2b_224, VerificationKey>

type MintAction {
  a: Int,
}

type CountDatum {
  a: Int,
}

type CountAction {
  a: Int,
}

type DisDatum {
  a: Int,
}

type DisAction {
  a: Int,
}

validator(o: VerificationKeyHash) {
  fn cmint(r: MintAction, c: ScriptContext) -> Bool {
    let ScriptContext { transaction, purpose } = c
    expect Mint(policy_id) = purpose

    let Transaction { mint, outputs, extra_signatories, .. } = transaction

    expect [(count_name, count_amount)] =
      mint
        |> from_minted_value
        |> tokens(policy_id)
        |> to_list()

    has(extra_signatories, o)
    when r.a is {
      1 ->
        any(
          outputs,
          fn(output) {
            expect InlineDatum(datum) = output.datum
            expect datum: CountDatum = datum
            quantity_of(output.value, policy_id, count_name) == 1
          },
        ) && count_amount == 1
      _ -> count_amount == -1
    }
  }
}

validator(o: VerificationKeyHash, p: PolicyId) {
  fn cval(d: CountDatum, r: CountAction, c: ScriptContext) -> Bool {
    let ScriptContext { transaction, purpose } = c
    expect Spend(ownRef) = purpose

    let Transaction { inputs, outputs, extra_signatories, .. } = transaction
    when r.a is {
      1 -> {
        expect Some(input) = find_input(inputs, ownRef)
        let Input { .. } = input
        expect ScriptCredential(script_hash) =
          input.output.address.payment_credential
        let in = values(tokens(input.output.value, p))

        let script_outs = find_script_outputs(outputs, script_hash)
        expect Some(output) = head(script_outs)
        let out = values(tokens(output.value, p))

        expect InlineDatum(datum) = output.datum
        expect datum: CountDatum = datum

        head(in) == head(out) && datum.a == d.a + 1
      }
      _ -> has(extra_signatories, o)
    }
  }
}

validator(o: VerificationKeyHash, p: PolicyId) {
  fn distro(d: DisDatum, r: DisAction, c: ScriptContext) -> Bool {
    let ScriptContext { transaction, purpose } = c
    expect Spend(ownRef) = purpose

    let Transaction { outputs, inputs, extra_signatories, .. } = transaction
    when r.a is {
      1 -> any(outputs, fn(output) { has(policies(output.value), p) })
      _ -> has(extra_signatories, o)
    }
  }
}
