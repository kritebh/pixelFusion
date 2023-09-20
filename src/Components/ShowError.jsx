import React from 'react'

const ShowError = ({error}) => {
  return (
    <div>
        <p className='text-red-500'>{error}</p>
    </div>
  )
}

export default ShowError