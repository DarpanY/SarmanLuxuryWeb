import "./Categories.css"

import { useNavigate } from "react-router-dom"

import category1 from "../../assets/images/categories/category1.jpg"
import category2 from "../../assets/images/categories/category2.jpg"
import category3 from "../../assets/images/categories/category3.jpeg"
import category4 from "../../assets/images/categories/category4.jpg"

function Categories() {

  const navigate = useNavigate()

  const categories = [

    {
      id:1,
      title:"Luxury Watches",
      image:category1,
      category:"Watches"
    },

    {
      id:2,
      title:"Premium Shoes",
      image:category2,
      category:"Shoes"
    },

    {
      id:3,
      title:"Designer Bags",
      image:category3,
      category:"Bags"
    },

    {
      id:4,
      title:"Luxury Eyewear",
      image:category4,
      category:"Sunglasses"
    }

  ]

  const goToCategory = (category) => {

    navigate(`/collections?category=${encodeURIComponent(category)}`)

  }

  return (

    <section className="categories">

      {/* SECTION HEADER */}

      <div className="categories-header">

        <span>
          SARMAN LUXURY
        </span>

        <h2>
          SHOP BY CATEGORY
        </h2>

      </div>

      {/* CATEGORY GRID */}

      <div className="categories-grid">

        {categories.map((item) => (

          <div
            className="category-card"
            key={item.id}
            onClick={() => goToCategory(item.category)}
          >

            {/* IMAGE */}

            <img
              src={item.image}
              alt={item.title}
            />

            {/* OVERLAY */}

            <div className="category-overlay"></div>

            {/* CONTENT */}

            <div className="category-content">

              <h3>
                {item.title}
              </h3>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  goToCategory(item.category)
                }}
              >
                EXPLORE →
              </button>

            </div>

          </div>

        ))}

      </div>

    </section>

  )

}

export default Categories