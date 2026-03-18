use anchor_lang::prelude::*;
mod contexts;
mod errors;
mod events;
mod states;

use anchor_lang::system_program;
use contexts::*;
use errors::*;
use events::*;

declare_id!("3Qs3YBv9mw656z56RKSJa2MLznZKrpiRgvME33TopxYi");

const MIN_NON_ZERO_AMOUNT: u64 = 1;
const MIN_DEADLINE_OFFSET_SECONDS: i64 = 1;

#[program]
pub mod vote_dapp {
    use super::*;

    pub fn initialize_treasury(
        ctx: Context<InitializeTreasury>,
        sol_price: u64,
        tokens_per_purchase: u64,
    ) -> Result<()> {
        require!(
            sol_price >= MIN_NON_ZERO_AMOUNT && tokens_per_purchase >= MIN_NON_ZERO_AMOUNT,
            VoteDappError::InvalidTreasuryConfig
        );

        let treasury_config_account = &mut ctx.accounts.treasury_config_account;
        treasury_config_account.authority = ctx.accounts.authority.key();
        treasury_config_account.bump = ctx.bumps.sol_vault;
        treasury_config_account.sol_price = sol_price;
        treasury_config_account.x_mint = ctx.accounts.x_mint.key();
        treasury_config_account.tokens_per_purchase = tokens_per_purchase;

        let proposal_counter_account = &mut ctx.accounts.proposal_counter_account;
        require!(
            proposal_counter_account.proposal_count == 0,
            VoteDappError::ProposalCounterAlreadyInitialized
        );
        proposal_counter_account.proposal_count = 1;
        proposal_counter_account.authority = ctx.accounts.authority.key();

        let election_round_account = &mut ctx.accounts.election_round_account;
        election_round_account.authority = ctx.accounts.authority.key();
        election_round_account.election_id = 1;

        let clock = Clock::get()?;
        emit!(TreasuryInitialized {
            authority: ctx.accounts.authority.key(),
            x_mint: ctx.accounts.x_mint.key(),
            sol_price,
            tokens_per_purchase,
            timestamp: clock.unix_timestamp,
        });

        emit!(ProposalCounterInitialized {
            authority: ctx.accounts.authority.key(),
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn purchase_tokens(ctx: Context<PurchaseTokens>) -> Result<()> {
        // 1. Buyer will transfer SOL to the sol_vault PDA
        let treasury_config_account = &mut ctx.accounts.treasury_config_account;
        let sol = treasury_config_account.sol_price;
        let token_amount = treasury_config_account.tokens_per_purchase;

        let transfer_ix = anchor_lang::system_program::Transfer {
            from: ctx.accounts.buyer.to_account_info(),
            to: ctx.accounts.sol_vault.to_account_info(),
        };
        system_program::transfer(
            CpiContext::new(ctx.accounts.system_program.to_account_info(), transfer_ix),
            sol,
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
            signer_seeds,
        );
        anchor_spl::token::mint_to(cpi_ctx, token_amount)?;

        emit!(TokensPurchased {
            buyer: ctx.accounts.buyer.key(),
            sol_paid: sol,
            tokens_received: token_amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn register_voter(ctx: Context<RegisterVoter>) -> Result<()> {
        let voter_account = &mut ctx.accounts.voter_account;
        voter_account.voter_id = ctx.accounts.authority.key();
        voter_account.current_election_id = 0; // Will be set on first vote
        voter_account.proposal_voted = 0; // No vote yet

        emit!(VoterRegistered {
            voter: ctx.accounts.authority.key(),
            voter_account: ctx.accounts.voter_account.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn register_proposal(
        ctx: Context<RegisterProposal>,
        proposal_info: String,
        deadline: i64,
        token_amount: u64,
    ) -> Result<()> {
        let clock = Clock::get()?;
        require!(!proposal_info.trim().is_empty(), VoteDappError::EmptyProposalInfo);
        require!(
            deadline > clock.unix_timestamp + MIN_DEADLINE_OFFSET_SECONDS,
            VoteDappError::InvalidDeadline
        );
        require!(token_amount >= MIN_NON_ZERO_AMOUNT, VoteDappError::InvalidAmount);

        let proposal_account = &mut ctx.accounts.proposal_account;

        // We transfer tokens from proposal creator to the treasury_token_account to prevent spam proposals. This also ensures that the proposal creator has a stake in the voting process.
        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.proposal_token_account.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        anchor_spl::token::transfer(cpi_ctx, token_amount)?;

        let proposal_info_clone = proposal_info.clone();

        proposal_account.authority = ctx.accounts.authority.key();
        proposal_account.proposal_info = proposal_info;
        proposal_account.deadline = deadline;

        let proposal_counter_account = &mut ctx.accounts.proposal_counter_account;
        proposal_account.proposal_id = proposal_counter_account.proposal_count;
        proposal_counter_account.proposal_count = proposal_counter_account
            .proposal_count
            .checked_add(1)
            .ok_or(VoteDappError::ProposalCounterOverflow)?;

        emit!(ProposalCreated {
            proposal_id: proposal_account.proposal_id,
            creator: ctx.accounts.authority.key(),
            proposal_info: proposal_info_clone,
            deadline,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn proposal_to_vote(ctx: Context<Vote>, proposal_id: u8, token_amount: u64) -> Result<()> {
        let clock = Clock::get()?;
        require!(token_amount >= MIN_NON_ZERO_AMOUNT, VoteDappError::InvalidAmount);
        let proposal_account = &mut ctx.accounts.proposal_account;
        require!(
            clock.unix_timestamp < proposal_account.deadline,
            VoteDappError::ProposalEnded
        );

        // Transfer tokens from voter to treasury to ensure that the voter has a stake in the voting process.
        let cpi_accounts = anchor_spl::token::Transfer {
            from: ctx.accounts.voter_token_account.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.authority.to_account_info(),
        };

        let cpi_ctx = CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts);
        anchor_spl::token::transfer(cpi_ctx, token_amount)?;

        let voter_account = &mut ctx.accounts.voter_account;
        require!(
            voter_account.proposal_voted == 0,
            VoteDappError::AlreadyVoted
        );

        // Update voter account with current election info
        let election_round = &ctx.accounts.election_round_account;
        voter_account.current_election_id = election_round.election_id;
        voter_account.proposal_voted = proposal_id;

        // Update proposal vote count
        proposal_account.number_of_votes = proposal_account
            .number_of_votes
            .checked_add(1)
            .ok_or(VoteDappError::ProposalVoteOverflow)?;

        // Update election result with leading proposal
        let election_result = &mut ctx.accounts.election_result_account;
        if election_result.election_id == 0 {
            // First time using this election result account
            election_result.election_id = election_round.election_id;
            election_result.winning_proposal_id = proposal_id;
            election_result.number_of_votes = 1;
        } else if proposal_account.number_of_votes > election_result.number_of_votes {
            // New leading proposal
            election_result.winning_proposal_id = proposal_id;
            election_result.number_of_votes = proposal_account.number_of_votes;
        }

        emit!(VoteCast {
            voter: ctx.accounts.authority.key(),
            proposal_id,
            total_votes: proposal_account.number_of_votes,
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn pick_winner(ctx: Context<PickWinner>, _proposal_id: u8) -> Result<()> {
        let clock = Clock::get()?;
        let election_result = &ctx.accounts.election_result_account;
        let proposal = &ctx.accounts.proposal_account;
        let winner = &mut ctx.accounts.winner_account;
        let election_round = &ctx.accounts.election_round_account;

        // Ensure voting deadline has passed
        require!(
            clock.unix_timestamp > proposal.deadline,
            VoteDappError::VotingStillActive
        );

        // Check if this proposal has any votes
        require!(
            proposal.number_of_votes > 0,
            VoteDappError::NoVotesCast
        );

        // Finalize winner account from election result
        winner.election_id = election_round.election_id;
        winner.winning_proposal_id = election_result.winning_proposal_id;
        winner.number_of_votes = election_result.number_of_votes;
        winner.proposal_info = proposal.proposal_info.clone();
        winner.declared_at = clock.unix_timestamp;

        emit!(WinnerDeclared {
            winning_proposal_id: election_result.winning_proposal_id,
            proposal_info: proposal.proposal_info.clone(),
            total_votes: election_result.number_of_votes,
            declared_by: ctx.accounts.authority.key(),
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn close_proposal(ctx: Context<CloseProposal>, proposal_id: u8) -> Result<()> {
        let clock = Clock::get()?;
        let proposal = &ctx.accounts.proposal_account;

        require!(
            clock.unix_timestamp >= proposal.deadline,
            VoteDappError::VotingStillActive
        );

        emit!(ProposalClosed {
            proposal_id,
            rent_recovered: ctx.accounts.proposal_account.to_account_info().lamports(),
            recovered_to: ctx.accounts.destination.key(),
            timestamp: clock.unix_timestamp,
        });

        Ok(())
    }

    pub fn close_voter(ctx: Context<CloseVoter>) -> Result<()> {
        emit!(VoterAccountClosed {
            voter: ctx.accounts.voter_account.voter_id,
            rent_recovered_to: ctx.accounts.authority.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }

    pub fn withdraw_sol(ctx: Context<WithdrawSol>, amount: u64) -> Result<()> {
        require!(amount >= MIN_NON_ZERO_AMOUNT, VoteDappError::InvalidAmount);
        let treasury_config = &ctx.accounts.treasury_config_account;
        require!(
            ctx.accounts.sol_vault.to_account_info().lamports() >= amount,
            VoteDappError::InsufficientVaultBalance
        );

        let sol_vault_seeds = &[b"sol-vault".as_ref(), &[treasury_config.bump]];
        let signer_seeds = &[&sol_vault_seeds[..]];

        let transfer_ix = system_program::Transfer {
            from: ctx.accounts.sol_vault.to_account_info(),
            to: ctx.accounts.authority.to_account_info(),
        };

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                transfer_ix,
                signer_seeds,
            ),
            amount,
        )?;

        emit!(SolWithdrawn {
            authority: ctx.accounts.authority.key(),
            amount,
            timestamp: Clock::get()?.unix_timestamp,
        });

        Ok(())
    }
}
