import React from 'react'

const Card = ({ title, content, link }) => {
  return (
    <div className="card bg-dark text-white">
      <div className="card-header" style={{fontSize: '1.4rem', fontWeight: 'bold'}}>
        {title}
      </div>
      <div className="card-body">
        {typeof content === 'string' ? (
          <p className="card-text">{content}</p>
        ) : (
          content
        )}
        {link && <a href="/#" className="card-link">{link}</a>}
      </div>
    </div>
  )
}

export default Card
