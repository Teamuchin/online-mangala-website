export default function AuthBrand({ logoClassName, titleClassName, wrapperClassName }) {
  return (
    <div className={wrapperClassName}>
      <img className={logoClassName} src="/logo.svg" alt="websitelogo" />
      <h1 className={titleClassName}>Mangala</h1>
    </div>
  )
}
