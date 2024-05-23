import { Link } from "react-router-dom"

const NotFound = () => {
  return (
    <section className="h-full w-full flex justify-center items-center">
        <div className="">
            <h1 className="text-4xl font-bold py-8">404 - Not Found</h1>
            <Link to="/" className="hover:underline text-gray-700">Go home</Link>
        </div>
    </section>
  )
}

export default NotFound