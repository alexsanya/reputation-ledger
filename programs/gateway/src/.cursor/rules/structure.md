programs/myproject/src/
├── lib.rs               # Main entrypoint — just glue code
├── context.rs           # #[derive(Accounts)] structs (instruction context)
├── instructions.rs      # Dispatches to individual instruction handlers
├── processor/
│   ├── mod.rs           # module re-export
│   ├── place_order.rs   # handle_place_order(ctx, args) -> Result
│   ├── complete_order.rs
│   └── refund.rs
├── state.rs             # Persistent account state (e.g., Order, Config)
├── errors.rs 