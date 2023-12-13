This example project has not been released yet.

I will briefly explain how the contract collection will work though so you can try to write it yourself if you are perusing in this repo...

The marketplace will work as a single contract.

To sell anything in the marketplace you will deposit your funds with a datum that contains your address && fee

For anyone to withdraw the value at the utxo, they must send the fee to the address in the datum.

That is all

With this marketplace contract you will be able to sell anything at a fixed price.

We should also include a way for people to unlist their token(s) by signing the transaction themselves.

