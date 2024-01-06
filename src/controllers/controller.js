// controller.js
const testController = async (req, res) => {
  try {
    return res.json({ number: 10 });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

export default testController;
