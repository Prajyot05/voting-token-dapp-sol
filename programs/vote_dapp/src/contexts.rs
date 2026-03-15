use anchor_lang::prelude::*;
use crate::states::TreasuryConfig;

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

    pub system_program: Program<'info, System>,
}
