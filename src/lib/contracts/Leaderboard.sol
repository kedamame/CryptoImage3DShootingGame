// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CryptoShooterLeaderboard
 * @dev On-chain leaderboard for CryptoImageShootingGame
 */
contract CryptoShooterLeaderboard {
    struct ScoreEntry {
        address player;
        uint256 score;
        uint256 timestamp;
    }

    // Maximum number of top scores to keep
    uint256 public constant MAX_TOP_SCORES = 100;

    // All scores (for history)
    ScoreEntry[] public allScores;

    // Top scores (sorted descending)
    ScoreEntry[] public topScores;

    // Player's best score
    mapping(address => uint256) public playerBestScore;

    // Events
    event ScoreSubmitted(address indexed player, uint256 score, uint256 timestamp);
    event NewHighScore(address indexed player, uint256 score, uint256 rank);

    /**
     * @dev Submit a new score
     * @param score The player's score
     */
    function submitScore(uint256 score) external {
        require(score > 0, "Score must be positive");

        ScoreEntry memory entry = ScoreEntry({
            player: msg.sender,
            score: score,
            timestamp: block.timestamp
        });

        // Add to all scores
        allScores.push(entry);

        // Update player's best score
        if (score > playerBestScore[msg.sender]) {
            playerBestScore[msg.sender] = score;
        }

        // Update top scores
        _updateTopScores(entry);

        emit ScoreSubmitted(msg.sender, score, block.timestamp);
    }

    /**
     * @dev Update the top scores list
     */
    function _updateTopScores(ScoreEntry memory entry) internal {
        uint256 len = topScores.length;

        // Find insertion position
        uint256 insertPos = len;
        for (uint256 i = 0; i < len; i++) {
            if (entry.score > topScores[i].score) {
                insertPos = i;
                break;
            }
        }

        // If score doesn't make top list and list is full, return
        if (insertPos >= MAX_TOP_SCORES) {
            return;
        }

        // Insert the new score
        if (len < MAX_TOP_SCORES) {
            topScores.push(entry);
            len++;
        }

        // Shift scores down
        for (uint256 i = len - 1; i > insertPos; i--) {
            topScores[i] = topScores[i - 1];
        }
        topScores[insertPos] = entry;

        emit NewHighScore(entry.player, entry.score, insertPos + 1);
    }

    /**
     * @dev Get top N scores
     */
    function getTopScores(uint256 count) external view returns (ScoreEntry[] memory) {
        uint256 len = topScores.length;
        if (count > len) {
            count = len;
        }

        ScoreEntry[] memory result = new ScoreEntry[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = topScores[i];
        }
        return result;
    }

    /**
     * @dev Get player's rank (1-indexed, 0 if not in top)
     */
    function getPlayerRank(address player) external view returns (uint256) {
        uint256 bestScore = playerBestScore[player];
        if (bestScore == 0) return 0;

        for (uint256 i = 0; i < topScores.length; i++) {
            if (topScores[i].player == player && topScores[i].score == bestScore) {
                return i + 1;
            }
        }
        return 0;
    }

    /**
     * @dev Get total number of scores submitted
     */
    function getTotalScoresCount() external view returns (uint256) {
        return allScores.length;
    }

    /**
     * @dev Get top scores count
     */
    function getTopScoresCount() external view returns (uint256) {
        return topScores.length;
    }
}
