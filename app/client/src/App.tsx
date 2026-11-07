import MyProducts from "./components/MyProducts";
import { SearchBar } from "./components/SearchBar";

function App() {
  return (
    <div>
      <h1>Price Comparison</h1>
      <p>Compare prices across multiple retailers.</p>
      <SearchBar/>
      <MyProducts/>
    </div>
  );
}

export default App;