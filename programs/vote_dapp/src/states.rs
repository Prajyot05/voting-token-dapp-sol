use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct TreasuryConfig {
    pub authority: Pubkey, // Who owns this account
    pub x_mint: Pubkey, // Which token is being sold
    pub treasure_token_account: Pubkey, // Where the tokens are stored
    pub sol_price: u64, // Price in SOL
    pub tokens_per_purchase: u64, // How many tokens are given per purchase
    pub bump: u8,
}