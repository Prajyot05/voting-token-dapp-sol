use anchor_lang::prelude::*;
use crate::states::TreasuryConfig;
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
        associated_token::mint = x_mint, // Which token is being sold
        associated_token::authority = authority // Who owns this account
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
