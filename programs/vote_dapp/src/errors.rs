use anchor_lang::prelude::*;
#[error_code]
pub enum VoteDappError {
    #[msg("You have already voted on this proposal.")]
    AlreadyVoted,

    #[msg("The proposal deadline has passed.")]
    InvalidDeadline,

    #[msg("Proposal account already initialized.")]
    ProposalCounterAlreadyInitialized,

    #[msg("Proposal counter overflow.")]
    ProposalCounterOverflow,

    #[msg("The proposal has already ended.")]
    ProposalEnded,

    #[msg("Proposal vote overflow.")]
    ProposalVoteOverflow,

    #[msg("You have already voted on this proposal.")]
    VoterAlreadyVoted,

    #[msg("The token mint of the voter token account does not match the expected x_mint.")]
    TokenMintMismatch,

    #[msg("Voting is still active. Cannot pick winner yet.")]
    VotingStillActive,

    #[msg("No votes have been cast. Cannot pick winner.")]
    NoVotesCast,

    #[msg("You are not authorized to perform this action")]
    UnauthorizedAccess,

    #[msg("Token account is not owned by the expected wallet")]
    InvalidTokenAccountOwner,

    #[msg("Provided mint account is invalid")]
    InvalidMint,
}