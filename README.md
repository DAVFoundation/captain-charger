# captain-charger

## Setup

Run in bash:

```bash
mkdir ~/.dav
touch ~/.dav/wallet
```

Open and edit `~/.dav/wallet` and save with following content:

```json
{
  "private": "0x<<YOUR WALLET PRIVATE KEY>>",
  "address": "0x<<YOUR WALLET ADDRESS>>",
  "nodeUrl": "https://<<A NETWORK NODE URL>>"
}
```

This wallet should have enough balance to perform the necessary transactions.
Then run:

```bash
npm i
npm run gen-n-reg
```

Copy the new DAV Identity Address which is printed if all goes well.

## Ropsten Faucet

```bash
curl -X POST  -H "Content-Type: application/json" -d '{"toWhom":"<<ADDRESS>>"}' https://ropsten.faucet.b9lab.com/tap
```

## API

### Register

Register a new charger to start accepting missions.
The returned token must be kept for future interactions with the API.

- Method: **POST**
- Path: **/register**
- Body (json):

```json
{
  "address": "" /* Charger DAV ID */,
  "lat": "" /* Charger latitude */,
  "lon": "" /* Charger longitude */,
  "radius": "" /* Charger service radius */
}
```

- Response (text): **charger token**

## Status

Access current status for charger. Use the token returned by `/register` to authenticate.

- Method: **GET**
- Path: **/status**
- Headers:
  - **Authorization: Bearer `[charger token]`**
- Response (text): **Waiting/Committed/Ready**
  - **Waiting**: Charger is waiting for new missions.
  - **Committed**: Charger is committed to a mission.
  - **Ready**: Charger can begin charging.

## Started

Notify that charging has began. Use the token returned by `/register` to authenticate.

- Method: **POST**
- Path: **/started**
- Headers:
  - **Authorization: Bearer `[charger token]`**
- Response: **(200 Ok)**

## Complete

Notify that charging has been completed. Use the token returned by `/register` to authenticate.

- Method: **POST**
- Path: **/complete**
- Headers:
  - **Authorization: Bearer `[charger token]`**
- Response: **(200 Ok)**

## Clear

Notify that charger is ready for a new mission after drone has left it. Use the token returned by `/register` to authenticate.

- Method: **POST**
- Path: **/clear**
- Headers:
  - **Authorization: Bearer `[charger token]`**
- Response: **(200 Ok)**
