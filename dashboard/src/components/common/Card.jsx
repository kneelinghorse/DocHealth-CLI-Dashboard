const Card = ({ title, subtitle, actions, children, footer }) => (
  <section className="card">
    {(title || subtitle || actions) && (
      <header className="card__header">
        <div>
          {title && <h2 className="card__title">{title}</h2>}
          {subtitle && <p className="card__subtitle">{subtitle}</p>}
        </div>
        {actions ? <div className="card__actions">{actions}</div> : null}
      </header>
    )}
    <div className="card__body">{children}</div>
    {footer ? <footer className="card__footer">{footer}</footer> : null}
  </section>
)

export default Card
