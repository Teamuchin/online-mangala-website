import { useGlobalHeader } from '../app/useGlobalHeader.js'
import styles from './LearnTrainPage.module.css'

export default function LearnTrainPage() {
  const { t } = useGlobalHeader()

  return (
    <div className={styles.learnpage}>
      <div className={styles.bodybuttons}>
        <p className={styles.learnText}>{t('learn.title')}</p>
        <p className={styles.learnText}>{t('learn.intro')}</p>

        <div className={styles.ruleBlock}>
          <p className={styles.ruleTitle}>{t('learn.rule1Title')}</p>
          <p className={styles.ruleText}>{t('learn.rule1Text')}</p>
        </div>

        <div className={styles.ruleBlock}>
          <p className={styles.ruleTitle}>{t('learn.rule2Title')}</p>
          <p className={styles.ruleText}>{t('learn.rule2Text')}</p>
        </div>

        <div className={styles.ruleBlock}>
          <p className={styles.ruleTitle}>{t('learn.rule3Title')}</p>
          <p className={styles.ruleText}>{t('learn.rule3Text')}</p>
        </div>

        <div className={styles.ruleBlock}>
          <p className={styles.ruleTitle}>{t('learn.rule4Title')}</p>
          <p className={styles.ruleText}>{t('learn.rule4Text')}</p>
        </div>
        <p className={styles.learnSource}>{t('learn.source')}</p>
      </div>
    </div>
  )
}
