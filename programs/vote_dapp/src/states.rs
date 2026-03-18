use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct TreasuryConfig {
    pub authority: Pubkey, // Who owns this account
    pub x_mint: Pubkey, // Which token is being sold
    pub treasury_token_account: Pubkey, // Where the tokens are stored
    pub sol_price: u64, // Price in SOL
    pub tokens_per_purchase: u64, // How many tokens are given per purchase
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Voter {
    pub voter_id: Pubkey, // Who owns this account
    pub proposal_voted: u8 // Which proposal the voter voted for
}

#[account]
#[derive(InitSpace)]
pub struct Proposal {
    pub proposal_id: u8, // Which proposal this is
    pub number_of_votes: u8, // How many votes this proposal has
    pub deadline: i64, // When the voting ends
    #[max_len(50)]
    pub proposal_info: String, // Description of the proposal
    pub authority: Pubkey, // Who created the proposal
}

#[account]
#[derive(InitSpace)]
pub struct ProposalCounter {
    pub authority: Pubkey, // Who owns this account
    pub proposal_count: u8
}