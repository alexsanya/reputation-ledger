// Valid commit tests
export { commitSuccess } from "./valid.test";

// Invalid signature tests
export { 
  commitWrongInstruction,
  commitWrongSignature,
  commitMissingInstruction 
} from "./invalid_signature.test";

// Wrong data tests
export { 
  commitWrongMint,
  commitInsufficientFunds 
} from "./wrong_data.test"; 