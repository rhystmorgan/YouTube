# Fractionalised NFTs

(I'm British, you are going to have to deal with the lack of 'z')

This fractionalised NFT example contract contains 3 Validators:
  - Minting Policy
  - Locking Validator
  - Distribution Validator

> Watch the YouTube video here:
>
> https://youtu.be/GiKnbrKHDkg

In this example I used some of the helper functions from the Okapi library. 

All of the helper functions are in the `okapi.ak` file, including the examples built from scratch in the video.

## How To Run

To run these contracts for yourself, refer to the main README.md of the YouTube Repo.

You will need to install Aiken, Deno and you will need to create a pair of wallets, refer to aiken docs for the scripts to do this ([with Lucid](https://aiken-lang.org/example--hello-world/end-to-end/lucid))

once you have an aiken prokect set up, put the okapi file in your `lib` directory, and the `frac.ak` in the validators directory.

## Purpose

The purpose of this contract is to create fractionalised tokens to provide shared/partial ownership of the NFT.

We are going to break down the different validators to explain what is happening:

## Minting Policy 

The Minting Policy takes a owner parameter and mints the NFT and the fraction tokens together.

```
validator(owner: VerificationKeyHash) {
  fn mint(r: MintAction, c: ScriptContext) -> Bool {
    ...
  }
}
```

It gets the minting policy from the `ScriptContext` and checks that it is minting a `ref_asset` and `frac_asset`(s) - we check against this later.

```
let ScriptContext { transaction, purpose } = c
expect Mint(policy_id) = purpose

let Transaction { mint, outputs, .. } = transaction

expect [(ref_asset_name, ref_amount), (frac_asset_name, frac_amount)] =
  mint
    |> value.from_minted_value
    |> value.tokens(policy_id)
    |> dict.to_list()
```

We also enforce that the transaction is signed by the `owner` param

```
expect tx_signed_by(transaction, owner)
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

when `r.a` is `1` we check for minting, any other case will only allow burning of tokens

for minting, we require an transaction output to contain 1 `ref_asset` and that it has the `TokenDatum`

```
expect
  list.any(
    outputs,
    fn(output) {
      expect InlineDatum(datum) = output.datum
      expect datum: TokenDatum = datum
      value.quantity_of(output.value, policy_id, ref_asset_name) == 1
    },
  )
```

we also require ALL the `ref_asset`(s) to be sent to a different output

```
expect
  list.any(
    outputs,
    fn(output) {
      value.quantity_of(output.value, policy_id, frac_asset_name) == r.b
    },
  )
```

it also checks the asset names against the expected asset names according to the `tn` field in the `redeemer`

```
let token_name_list = fraction_token_prefix(r.tn)
let ref_tn_check =
  compare_token_names(ref_asset_name, list.at(token_name_list, 0))
let frac_tn_check =
  compare_token_names(frac_asset_name, list.at(token_name_list, 1))
ref_amount == 1 && frac_amount == r.b && ref_tn_check && frac_tn_check
```

for all other redeemer cases, we enable burning of the assets.

in the video I said it will force the whole group of frac tokens to be burned but this isnt actually the case,

we only force the number in the burn redeemer `r.b` so any value that matches the number of burned tokens would pass this check.

```
_ -> {
  let token_name_list = fraction_token_prefix(r.tn)
  let ref_tn_check =
    compare_token_names(ref_asset_name, list.at(token_name_list, 0))
  let frac_tn_check =
    compare_token_names(frac_asset_name, list.at(token_name_list, 1))

  ref_amount == -1 && frac_amount == -r.b && ref_tn_check && frac_tn_check
}

```

> Note: for the other validators we used the Okapi library of helper functions to make the process simpler, learn more about okapi here:
(okapi)

Okapi is still in development, so I have not included the full library, only what we use here.

## Locking Validator

The locking validator holds the NFT (ref_asset) and contains the metadata that the fractionalised tokens refer to.

It is parameterised by the `owner` pkh and the `policy_id` of the minting policy.

```
validator(owner: VerificationKeyHash, cs: value.PolicyId) {
  fn lock(d: TokenDatum, r: LockAction, c: ScriptContext) -> Bool {
    ...
  }
}
```

It checks for `r.a` redeemer, if it is one, it will allow spending, but only a transaction with a single `policy_id` from param. 

It also enforces that the token goes back to the validator, and that the `owner` signs the transaction. 

```
when r.a is {
  1 -> {
    let out = ok.get_own_singleton_output(c)
    ok.contains_single_token_of(out.value, cs) && tx_signed_by(
      c.transaction,
      owner,
    )
  }
  ...
}
```

All other cases are covered by forcing the transaction to be signed by the `owner` param.

```
_ -> tx_signed_by(c.transaction, owner)
```

To improve this we should enforce the output datum matches `TokenDatum`. 

If we forget to add a datum to this output, the transaction will succeed but it will become unspendable and locked in the validator forever!

## Distribution Validator

The distribution validator holds the fractionalised tokens and allows people to redeem or purchase a `frac_asset`.

It is parameterised by the `owner` pkh.

```
validator(owner: VerificationKeyHash) {
  fn distro(d: DisDatum, r: DisAction, c: ScriptContext) -> Bool {
  }
}
```

When the `r.a` redeemer value is `1`, it will allow you to withdraw a single `frac_asset`.

It also requires the rest of the `frac_asset`(s) to be sent back to the validator.

```
when r.a is {
  1 -> {
    let out = ok.get_own_singleton_output(c)
    let in = ok.get_own_input(c)

    ok.has_one_singleton_asset_less(in.value, out.value)
  }
  ...
}
```

For all other cases, it requires the `owner` signature

```
_ -> tx_signed_by(c.transaction, owner)
```
