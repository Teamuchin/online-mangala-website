import { useAppData } from '../app/useAppData.js'

export default function AuthBrand({ logoClassName, titleClassName, wrapperClassName }) {
  const { assets, brandName } = useAppData()

  return (
    <div className={wrapperClassName}>
      <img className={logoClassName} src={assets.logo} alt="websitelogo" />
      <h1 className={titleClassName}>{brandName}</h1>
    </div>
  )
}
