The example oracle validators have not been released yet.

I will explain how they will work so you can try and build it for yourself, seeing as you have checked out this repo...

The oracle will have 2 validators.

The first will mint a valid token to highlight the thread and prove it is the correct feed.

The token will be locked into a spending validator which will hold the data and allow the owner to update it.

That is it.

The oracle datum can look however you want, but a timestamp, plus some data, is probably a good starting point.

The token will be named after its owner, so we can check the owner is the only person who can update it.

The minting policy will force the token name to be the signatory pkh

The locking validator will allow the datum of the oracle feed to be updated provided the token utxo being spent is signed by the matching pkh (the owner).

We wil lalso make sure that the datum is updated with the appropriate time (the time of the transaction) so we have an accurate snapshot of the data posted there.