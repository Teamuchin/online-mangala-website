import styles from "./LearnTrainPage.module.css"
export default function LearnTrainPage(){
    return (
        <div className={styles.learnpage}>
            <div className={styles.bodybuttons}>
                <p className={styles.learnText}>
                    Mangala, a Turkish game of intelligence and strategy, is played by two people. The game board features 12 small pits—six on each side—and a large treasury where each player collects their stones. Mangala is played with 48 stones.
                </p>
                <p className={styles.learnText}>
                    Players distribute the 48 stones, placing 4 in each of the 12 small pits. The 6 small pits in a row in front of each player form that player’s territory. The 6 small pits directly across from them form the opponent’s territory. Players aim to collect the most stones in their treasury. At the end of the game, the player who has collected the most stones wins the game. The game begins with a coin toss. There are 4 main basic rules in the game.
                </p>
                

                <div className={styles.ruleBlock}>
                    <p className={styles.ruleTitle}>1. BASIC RULE</p>
                    <p className={styles.ruleText}>
                        The player who wins the coin toss takes 4 stones from any hole in their own territory. They leave one stone in the hole they took it from and distribute the remaining stones, placing one in each hole in a counterclockwise direction (to the right) until they run out. If the last stone in their hand lands on their own treasure, the player gets another turn. If a player has only one stone left in their hole, they may move that stone to the hole to their right when it is their turn. The turn then passes to the opponent. The last stone remaining in a player’s hand at the end of each turn determines the outcome of the game.
                    </p>
                </div>

                <div className={styles.ruleBlock}>
                    <p className={styles.ruleTitle}>2. BASIC RULE</p>
                    <p className={styles.ruleText}>
                        When it is a player’s turn to distribute the stones taken from their own well, if they have stones left in their hand, they continue to place stones in the wells of their opponent’s territory. If the last stone in the player’s hand doubles the number of stones in the opponent’s pit (e.g., 2, 4, 6, 8), the player takes ownership of all the stones in that pit and adds them to their own collection. The turn passes to the opponent.
                    </p>
                </div>

                <div className={styles.ruleBlock}>
                    <p className={styles.ruleTitle}>3. BASIC RULE</p>
                    <p className={styles.ruleText}>
                        If the last stone remaining in a player’s hand lands in an empty well within their own territory, and if there is a stone belonging to the opponent in the well directly opposite that empty well, the player takes the stones from the opponent’s well and also retrieves the stone they placed in their own empty well, adding it to their treasury. The turn passes to the opponent.
                    </p>
                </div>

                <div className={styles.ruleBlock}>
                    <p className={styles.ruleTitle}>4. BASIC RULE</p>
                    <p className={styles.ruleText}>
                        The game ends when the stones in either player’s area run out. The player who runs out of stones in their own area first also wins all the stones in the opponent’s area. Therefore, the game’s intensity never wanes until the very end.
                    </p>
                </div>
                <p className={styles.learnSource}>
                    source:mangala.com.tr
                </p>
            </div>
        </div>
    );
}
