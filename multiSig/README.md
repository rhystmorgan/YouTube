This example project has not been released yet.

I will explain how the contract will work though so you can try to write it yourself ...

The multisig will work with 2 validators.

The first will initialise the muitisig with a token.

The second will be the actual multisig validator.

That is all.

The initialising token will set the rules for spending, the initial pkh's and the min required signatories to spend.

The multisig will have several different redeemer cases:
- adding a member (pkh)
- removing a member (pkh)
- spending value from the multisig