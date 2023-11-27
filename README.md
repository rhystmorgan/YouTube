# YouTube

Smart Contract examples and tutorials from YouTube 

> DO NOT USE THESE CONTRACTS ON MAINNET!

These contracts are written for educational purposes *only*, and are not secure or complete. 

They should not be used in real world applications. `YOU HAVE BEEN WARNED!`

## Learn Cardano Smart Contracts

This repo contains all of my example contracts from YouTube, written in Aiken and Lucid

To run any of this yourself you will need to install Aiken and Deno. 

> You can follow the getting started guide on [aiken-lang.org](https://aiken-lang.org/installation-instructions)

## Using This Repo

Just copy the appropriate `.ak` file into `validators` and run `aiken build` to compile it.

In each of the `.ts` files you will see a command to run 

eg:
```
// deno run --allow-net --allow-read --allow-env lucidInit.ts
```

## Example Contracts

[Fractionalised NFT](./fractionalisedNfts/README.md)

## A Note On Okapi

Okapi is a library of helper functions I am building, right now it is in the early stages and none of the functions are optimised for performance. Instead I have just built functionality into a lot of them and completely disregarded performance. 

None of these helper functions should be used on mainnet until its official release as a library.

The functions often take in a `ScriptContext` and work from there. This is about as low an efficiency as we can get with smart contracts. 

These functions even call each other!

I will be sharing specific helper functions in each directory that are used to make writing the code faster and easier to explain, but you should avoid using them as they are shown in these tutorial repos because it will bloat your contracts very quickly.

