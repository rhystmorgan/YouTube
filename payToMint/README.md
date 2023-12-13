The pay to mint contract has not been created yet, but I will describe how the contracts will work so you can give it a go yourself!

Pay to mint is pretty simple, but it will have a few validators.

You could hardcode the fee values, but you might want to be able to change the fee in the future, do sales, increase or decrease price, or make it variable based on some other information.

For this reason we will have a reference input that has the fee and the address to pay to.

then we can reference that datum to check the correct fee is in place when minting.

So we have a reference minting policy that enforces this information.

We have a locking validator which holds the reference token and allows you to change the fee or pkh, if the transaction is signed by the owner.

The minting policy will allow you to mint a single token, as long as you send the fee value to the pkh in the reference datum.