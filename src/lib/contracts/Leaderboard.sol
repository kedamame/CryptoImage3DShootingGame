// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CryptoShootingLeaderboard
 * @dev Simple on-chain leaderboard for CryptoImageShootingGame
 */
contract CryptoShootingLeaderboard {
    struct ScoreEntry {
        address player;
        uint256 score;
        uint256 timestamp;
    }

    // Top 100 scores
    ScoreEntry[] public topScores;
    uint256 public constant MAX_LEADERBOARD_SIZE = 100;

    // Player's best score
    mapping(address => uint256) public playerBestScore;

    // Events
    event ScoreSubmitted(address indexed player, uint256 score, uint256 rank);
    event NewHighScore(address indexed player, uint256 score);

    /**
     * @dev Submit a new score
     * @param score The score to submit
     */
    function submitScore(uint256 score) external {
        require(score > 0, "Score must be greater than 0");

        // Update player's best score if this is higher
        if (score > playerBestScore[msg.sender]) {
            playerBestScore[msg.sender] = score;
            emit NewHighScore(msg.sender, score);
        }

        // Find position in leaderboard
        uint256 position = topScores.length;
        for (uint256 i = 0; i < topScores.length; i++) {
            if (score > topScores[i].score) {
                position = i;
                break;
            }
        }

        // If score qualifies for leaderboard
        if (position < MAX_LEADERBOARD_SIZE) {
            ScoreEntry memory newEntry = ScoreEntry({
                player: msg.sender,
                score: score,
                timestamp: block.timestamp
            });

            if (topScores.length < MAX_LEADERBOARD_SIZE) {
                topScores.push(newEntry);
            }

            // Shift scores down
            for (uint256 i = topScores.length - 1; i > position; i--) {
                topScores[i] = topScores[i - 1];
            }
            topScores[position] = newEntry;

            emit ScoreSubmitted(msg.sender, score, position + 1);
        }
    }

    /**
     * @dev Get top N scores
     * @param count Number of scores to return
     */
    function getTopScores(uint256 count) external view returns (ScoreEntry[] memory) {
        uint256 resultCount = count > topScores.length ? topScores.length : count;
        ScoreEntry[] memory result = new ScoreEntry[](resultCount);

        for (uint256 i = 0; i < resultCount; i++) {
            result[i] = topScores[i];
        }

        return result;
    }

    /**
     * @dev Get total number of scores on leaderboard
     */
    function getLeaderboardSize() external view returns (uint256) {
        return topScores.length;
    }

    /**
     * @dev Get player's rank (0 if not on leaderboard)
     */
    function getPlayerRank(address player) external view returns (uint256) {
        for (uint256 i = 0; i < topScores.length; i++) {
            if (topScores[i].player == player) {
                return i + 1;
            }
        }
        return 0;
    }
}
