# Transaction Counter

This contract collection is designed to count the number of transactions that a validator spends

There are 3 Validators:
  - Minting Policy
  - Count Validator
  - Distribution Validator

> Watch the YouTube video here:
>
> https://youtu.be/rjj4bs65imA

In this example we write everything from scratch (no helper functions)

> Note: There is a security flaw in these contracts, I mention it at the bottom of this documentation.

## How To Run

To run these contracts for yourself, refer to the main [README.md](../README.md) of the YouTube Repo.

You will need to install Aiken, Deno and you will need to create a pair of wallets, refer to aiken docs for the scripts to do this ([with Lucid](https://aiken-lang.org/example--hello-world/end-to-end/lucid))

Once you have an aiken project set up, put the `counter.ak` in the validators directory, and the `counter.ts` file in your project root directory.

## Purpose

The purpose of this contract is to track the number of transactions being spent from a validator.

Below you will find a breakdown of the different validators to explain what is happening:

## Minting Policy

The minting policy takes an owner `o` parameter and mints the `count` token.

```
validator(o: VerificationKeyHash) {
  fn cmint(r: MintAction, c: ScriptContext) -> Bool {
    ...
  }
}
```

It gets the `policy_id` from the `ScriptContext` and gets the minted values of the policy

```
let ScriptContext { transaction, purpose } = c
expect Mint(policy_id) = purpose

let Transaction { mint, outputs, extra_signatories, .. } = transaction

expect [(count_name, count_amount)] =
  mint
    |> from_minted_value
    |> tokens(policy_id)
    |> to_list()
```

we also enforce that the transaction is signed by the owner `o` parameter 

```
has(extra_signatories, o)
```

we decide which transaction logic to enforce based on the `a` field of the redeemer `r`.

```
when r.a is {
  1 -> {
    ...
  }
  _ -> {
    ...
  }
}
```

when `r.a` is `1` we check for minting, any other case will only allow burning of tokens.

for minting, we check the output containing the `count` token also has the `CountDatum` and that there is only one asset minted.

```
any(
  outputs,
  fn(output) {
    expect InlineDatum(datum) = output.datum
    expect datum: CountDatum = datum
    quantity_of(output.value, policy_id, count_name) == 1
  },
) && count_amount == 1
```

for burning, we only need to check that the asset is burned (mints -1)

```
count_amount == -1
```

## Count Validator

The count validator locks the count token, it needs to allow spending, but only to spend the token back to itself, with an updated datum.

It is parameterised by the `owner` pkh and the `policy_id` of the minting policy.

```
validator(o: VerificationKeyHash, p: PolicyId) {
  fn cval(d: CountDatum, r: CountAction, c: ScriptContext) -> Bool {
    ...
  }
}
```

similar to the minting policy, the redeemer `r` has an `a` field which we use to indicate which checks to make against the transaction.

```
when r.a is {
  1 -> {
    ...
  }
  _ -> {
    ...
  }
}
```

If the redeemer value is `1` we apply the spending logic to increase the count.

It checks that the validator's own input `ownRef` has a token of the policyId parameter `p`

It also gets its own `script_hash` from its input

```
expect Some(input) = find_input(inputs, ownRef)
let Input { .. } = input
expect ScriptCredential(script_hash) =
  input.output.address.payment_credential
let in = values(tokens(input.output.value, p))
```

We use this `script_hash` to check the token is sent back to the validator

```
let script_outs = find_script_outputs(outputs, script_hash)
expect Some(output) = head(script_outs)
let out = values(tokens(output.value, p))
```

We check the output datum is of the appropriate structure `CountDatum`

```
expect InlineDatum(datum) = output.datum
expect datum: CountDatum = datum
```

and finally we run the `in` and `out` value checks and verify the `datum` count is increased by `1`

```
head(in) == head(out) && datum.a == d.a + 1
```

All other cases are covered by forcing the transaction to be signed by the owner `o` param.

```
has(extra_signatories, o)
```

This will allow the owner to close this process in the future - e.g. if it is no longer needed.

## Distribution Validator

The distributionn validator is the contract whose transactions we are counting.

```
validator(o: VerificationKeyHash, p: PolicyId) {
  fn distro(d: DisDatum, r: DisAction, c: ScriptContext) -> Bool {
    ...
  }
}
```

There isnt much to do here other than check the transaction

When redeemer `r.a` is `1` we check our transaction logic

```
when r.a is {
  1 -> any(outputs, fn(output) { has(policies(output.value), p) })
  _ -> ...
}
```

this check is that there is `any` output which containes the policy_id `p` of our count token

this token is in the transaction, it will allow you to spend.

for all other redeemer cases, we have just said that it needs to be signed by the owner `o` param.

```
_ -> has(extra_signatories, o)
```

This is actually a bit of a security flaw. it enables the owner to spend from this validator WITHOUT the count token, meaning they would be able to redeem any value from the validator without any tracking.

should this be allowed?

I don't think so, but there may be cases where something like this is enabled, however in any open source contract you should check to see if there is 'overriding' capabilities of the project owner and you should decide for yourself how big of a risk such a backdoor poses.