// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CryptoShooterLeaderboard
 * @dev On-chain leaderboard for CryptoImage3DShootingGame
 */
contract CryptoShooterLeaderboard {
    struct ScoreEntry {
        address player;
        uint256 score;
        uint256 timestamp;
        string username;
    }

    // Top 100 scores
    uint256 public constant MAX_LEADERBOARD_SIZE = 100;

    ScoreEntry[] public leaderboard;

    // Player's best score
    mapping(address => uint256) public playerBestScore;

    // Events
    event ScoreSubmitted(address indexed player, uint256 score, string username);
    event NewHighScore(address indexed player, uint256 score, uint256 rank);

    /**
     * @dev Submit a score to the leaderboard
     * @param score The player's score
     * @param username The player's display name (Farcaster username or ENS)
     */
    function submitScore(uint256 score, string calldata username) external {
        require(score > 0, "Score must be greater than 0");

        emit ScoreSubmitted(msg.sender, score, username);

        // Update player's best score
        if (score > playerBestScore[msg.sender]) {
            playerBestScore[msg.sender] = score;
        }

        // Try to add to leaderboard
        _updateLeaderboard(msg.sender, score, username);
    }

    /**
     * @dev Update the leaderboard with a new score
     */
    function _updateLeaderboard(address player, uint256 score, string calldata username) internal {
        ScoreEntry memory newEntry = ScoreEntry({
            player: player,
            score: score,
            timestamp: block.timestamp,
            username: username
        });

        // If leaderboard is not full, just add and sort
        if (leaderboard.length < MAX_LEADERBOARD_SIZE) {
            leaderboard.push(newEntry);
            _sortLeaderboard();

            uint256 rank = _findRank(player, score);
            if (rank <= MAX_LEADERBOARD_SIZE) {
                emit NewHighScore(player, score, rank);
            }
            return;
        }

        // Check if score is higher than the lowest score
        if (score > leaderboard[leaderboard.length - 1].score) {
            leaderboard[leaderboard.length - 1] = newEntry;
            _sortLeaderboard();

            uint256 rank = _findRank(player, score);
            emit NewHighScore(player, score, rank);
        }
    }

    /**
     * @dev Simple bubble sort for the leaderboard (descending order)
     */
    function _sortLeaderboard() internal {
        uint256 n = leaderboard.length;
        for (uint256 i = 0; i < n - 1; i++) {
            for (uint256 j = 0; j < n - i - 1; j++) {
                if (leaderboard[j].score < leaderboard[j + 1].score) {
                    ScoreEntry memory temp = leaderboard[j];
                    leaderboard[j] = leaderboard[j + 1];
                    leaderboard[j + 1] = temp;
                }
            }
        }
    }

    /**
     * @dev Find the rank of a player's score
     */
    function _findRank(address player, uint256 score) internal view returns (uint256) {
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i].player == player && leaderboard[i].score == score) {
                return i + 1;
            }
        }
        return MAX_LEADERBOARD_SIZE + 1;
    }

    /**
     * @dev Get the top N scores
     */
    function getTopScores(uint256 count) external view returns (ScoreEntry[] memory) {
        uint256 resultCount = count < leaderboard.length ? count : leaderboard.length;
        ScoreEntry[] memory result = new ScoreEntry[](resultCount);

        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = leaderboard[i];
        }

        return result;
    }

    /**
     * @dev Get the total number of entries in the leaderboard
     */
    function getLeaderboardSize() external view returns (uint256) {
        return leaderboard.length;
    }

    /**
     * @dev Get a player's rank (returns 0 if not in leaderboard)
     */
    function getPlayerRank(address player) external view returns (uint256) {
        for (uint256 i = 0; i < leaderboard.length; i++) {
            if (leaderboard[i].player == player) {
                return i + 1;
            }
        }
        return 0;
    }
}
