use anchor_lang::prelude::*;
mod states;
mod contexts;

use states::*;
use contexts::*;

declare_id!("3Qs3YBv9mw656z56RKSJa2MLznZKrpiRgvME33TopxYi");

#[program]
pub mod vote_dapp {
    use super::*;

    pub fn initialize(ctx: Context<InitializeTreasury>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}