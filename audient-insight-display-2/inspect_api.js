
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbnR1bmVzQG11cGEuYXBwIiwiZXhwIjoxNzcwNDA3NzIwfQ.mImchxDu0n7Vm_G09QAPWU5m-N-w6lJLWoQ-uNPQjqA";

async function fetchProducts() {
  try {
    const response = await fetch("http://srv-mupa.ddns.net:5050/api/products?skip=0&limit=5", {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error:", error);
  }
}

fetchProducts();
