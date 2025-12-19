use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, MintTo, Token, TokenAccount};

declare_id!("TrenchRunner111111111111111111111111111111111");

#[program]
mod trench_runner {
    use super::*;

    pub fn submit_score(ctx: Context<SubmitScore>, score: u64) -> Result<()> {
        let account = &mut ctx.accounts.highscore;
        if score > account.best_score {
            account.best_score = score;
            account.authority = ctx.accounts.player.key();
        }
        Ok(())
    }

    pub fn mint_badge(ctx: Context<MintBadge>, bump: u8) -> Result<()> {
        let seeds: &[&[u8]] = &[b"badge", ctx.accounts.player.key().as_ref(), &[bump]];
        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.badge_mint.to_account_info(),
                    to: ctx.accounts.badge_account.to_account_info(),
                    authority: ctx.accounts.mint_authority.to_account_info(),
                },
                &[seeds],
            ),
            1,
        )?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct SubmitScore<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(
        init_if_needed,
        payer = player,
        space = 8 + 8 + 32,
        seeds = [b"highscore", player.key().as_ref()],
        bump
    )]
    pub highscore: Account<'info, HighScore>;
    pub system_program: Program<'info, System>;
}

#[account]
pub struct HighScore {
    pub best_score: u64,
    pub authority: Pubkey,
}

#[derive(Accounts)]
pub struct MintBadge<'info> {
    #[account(mut)]
    pub player: Signer<'info>,
    #[account(mut, seeds = [b"badge", player.key().as_ref()], bump)]
    pub badge_mint: Account<'info, Mint>,
    #[account(mut)]
    pub badge_account: Account<'info, TokenAccount>,
    /// CHECK: PDA authority for mint
    #[account(seeds = [b"badge", player.key().as_ref()], bump)]
    pub mint_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
}
