use anchor_lang::prelude::*;
use crate::{errors::VoteDappError, states::{ElectionResult, ElectionRound, Proposal, ProposalCounter, TreasuryConfig, Voter, Winner}};
use anchor_spl::{associated_token::AssociatedToken, token::{Mint, Token, TokenAccount}};

#[derive(Accounts)]
pub struct InitializeTreasury<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + TreasuryConfig::INIT_SPACE,
        seeds = [b"treasury-config"],
        bump
    )]
    pub treasury_config_account: Account<'info, TreasuryConfig>,

    #[account(
        init,
        space = 8 + ProposalCounter::INIT_SPACE,
        payer = authority,
        seeds = [b"proposal-counter"],
        bump,
    )]
    pub proposal_counter_account: Account<'info, ProposalCounter>,

    #[account(
        init,
        space = 8 + ElectionRound::INIT_SPACE,
        payer = authority,
        seeds = [b"election-round"],
        bump,
    )]
    pub election_round_account: Account<'info, ElectionRound>,

    #[account(
        init,
        payer = authority,
        mint::authority = mint_authority,
        mint::decimals = 6,
        seeds = [b"x-mint"],
        bump
    )]
    pub x_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        associated_token::mint = x_mint,
        associated_token::authority = authority
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    /// CHECK: PDA validated by fixed seeds and bump; this account only holds lamports.
    #[account(
        mut,
        seeds = [b"sol-vault"],
        bump
    )]
    pub sol_vault: AccountInfo<'info>,

    /// CHECK: PDA is only used as mint authority signer via seeds and bump.
    #[account(
        seeds = [b"mint-authority"],
        bump
    )]
    pub mint_authority: AccountInfo<'info>,

    pub token_program: Program<'info, Token>,

    pub associated_token_program: Program<'info, AssociatedToken>,

    pub system_program: Program<'info, System>,
}


#[derive(Accounts)]
pub struct PurchaseTokens<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: This account receives SOL from the user
    #[account(
        mut,
        seeds = [b"sol-vault"],
        bump
    )]
    pub sol_vault: AccountInfo<'info>,

    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = buyer_token_account.owner == buyer.key(),
        constraint = buyer_token_account.mint == x_mint.key()
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    
    #[account(mut)]
    pub x_mint: Account<'info, Mint>,

    /// CHECK: PDA is only used as mint authority signer via seeds and bump.
    #[account(
        seeds = [b"mint-authority"],
        bump
    )]
    pub mint_authority: AccountInfo<'info>,

    #[account(
        seeds = [b"treasury-config"],
        bump,
        constraint = treasury_config_account.x_mint == x_mint.key()
    )]
    pub treasury_config_account: Account<'info, TreasuryConfig>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterVoter<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Voter::INIT_SPACE,
        seeds = [b"voter", authority.key().as_ref()],
        bump
    )]
    pub voter_account: Account<'info, Voter>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RegisterProposal<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + Proposal::INIT_SPACE,
        seeds = [b"proposal", proposal_counter_account.proposal_count.to_le_bytes().as_ref()],
        bump
    )]
    pub proposal_account: Account<'info, Proposal>,

    #[account(
        mut,
        constraint = proposal_token_account.mint == x_mint.key(),
        constraint = proposal_token_account.owner == authority.key()
    )]
    pub proposal_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub proposal_counter_account: Account<'info, ProposalCounter>,

    pub x_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = treasury_token_account.mint == x_mint.key()
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(proposal_id: u8)]
pub struct Vote<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"voter", authority.key().as_ref()],
        bump,
        constraint = voter_account.proposal_voted == 0 @ VoteDappError::VoterAlreadyVoted
    )]
    pub voter_account: Account<'info, Voter>,

    pub x_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = voter_token_account.mint == x_mint.key() @ VoteDappError::TokenMintMismatch,
        constraint = voter_token_account.owner == authority.key()
    )]
    pub voter_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = treasury_token_account.mint == x_mint.key()
    )]
    pub treasury_token_account: Account<'info, TokenAccount>,
   
    #[account(
        mut,
        seeds = [b"proposal", proposal_id.to_le_bytes().as_ref()],
        bump
    )]
    pub proposal_account: Account<'info, Proposal>,

    #[account(
        seeds = [b"election-round"],
        bump
    )]
    pub election_round_account: Account<'info, ElectionRound>,

    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + ElectionResult::INIT_SPACE,
        seeds = [b"election-result", election_round_account.election_id.to_le_bytes().as_ref()],
        bump
    )]
    pub election_result_account: Account<'info, ElectionResult>,

    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(proposal_id: u8)]
pub struct PickWinner<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        seeds = [b"election-round"],
        bump
    )]
    pub election_round_account: Account<'info, ElectionRound>,

    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + Winner::INIT_SPACE,
        seeds = [b"winner", election_round_account.election_id.to_le_bytes().as_ref()],
        bump
    )]
    pub winner_account: Account<'info, Winner>,

    #[account(
        mut,
        seeds = [b"election-result", election_round_account.election_id.to_le_bytes().as_ref()],
        bump
    )]
    pub election_result_account: Account<'info, ElectionResult>,

    #[account(
        seeds = [b"proposal", proposal_id.to_le_bytes().as_ref()],
        bump
    )]
    pub proposal_account: Account<'info, Proposal>,

    pub system_program: Program<'info, System>,
}
