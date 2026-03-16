use anchor_lang::prelude::*;
mod states;
mod contexts;

use contexts::*;
use anchor_lang::system_program;

declare_id!("3Qs3YBv9mw656z56RKSJa2MLznZKrpiRgvME33TopxYi");

#[program]
pub mod vote_dapp {
    use super::*;

    pub fn initialize_treasury(ctx: Context<InitializeTreasury>, sol_price: u64, tokens_per_purchase: u64) -> Result<()> {
        let treasury_config_account = &mut ctx.accounts.treasury_config_account;
        treasury_config_account.authority = ctx.accounts.authority.key();
        treasury_config_account.bump = ctx.bumps.sol_vault;
        treasury_config_account.sol_price = sol_price;
        treasury_config_account.x_mint = ctx.accounts.x_mint.key();
        treasury_config_account.tokens_per_purchase = tokens_per_purchase;
        Ok(())
    }

    pub fn purchase_tokens(ctx: Context<PurchaseTokens>) -> Result<()> {
        // 1. Buyer will transfer SOL to the sol_vault PDA
        let treasury_config_account = &mut ctx.accounts.treasury_config_account;
        let sol = treasury_config_account.sol_price;
        let token_amount = treasury_config_account.tokens_per_purchase;

        let transfer_ix = anchor_lang::system_program::Transfer{
            from: ctx.accounts.buyer.to_account_info(),
            to: ctx.accounts.sol_vault.to_account_info()
        };
        system_program::transfer(
            CpiContext::new(ctx.accounts.system_program.to_account_info(), transfer_ix),
            sol
        )?;

        // We are using the mint authority PDA to sign the mint_to instruction. 
        // Since the mint authority is a PDA, we need to provide the seeds and bump to sign the transaction.
        // The mint_to instruction will mint the xTokens to the buyer's token account.
        let mint_authority_seeds = &[b"mint-authority".as_ref(), &[ctx.bumps.mint_authority]];
        let signer_seeds = &[&mint_authority_seeds[..]];

        let cpi_accounts = anchor_spl::token::MintTo {
            mint: ctx.accounts.x_mint.to_account_info(),
            to: ctx.accounts.buyer_token_account.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };

        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds
        );
        anchor_spl::token::mint_to(cpi_ctx, token_amount)?;
        Ok(())
    }
}