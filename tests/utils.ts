// TypeScript: Serialize `Order` object for Rust deserialization
import { Schema, serialize } from "borsh";
import bs58 from "bs58";

export class Order {
    user: Uint8Array;
    job_hash: Uint8Array;
    price: bigint;
    price_valid_until: bigint;
    deadline: bigint;
  
    constructor(fields: {
      user: Uint8Array;
      job_hash: Uint8Array;
      price: bigint;
      price_valid_until: bigint;
      deadline: bigint;
    }) {
      Object.assign(this, fields);
    }
  }
  
  const schema: Schema = {
    struct: {
      user: {
        array: {
          type: "u8",
          len: 32
        }
      },
      job_hash: {
        array: {
          type: "u8",
          len: 32
        }
      },
      price: "u64",
      price_valid_until: "u64",
      deadline: "i64" 
    }
  };
  
  export const serializeOrder = (order: Order) => {
    // call serialize and return as base58 string
    //const serializedOrder = serialize(schema, order);
    //return bs58.encode(serializedOrder);
    return serialize(schema, order);
  }