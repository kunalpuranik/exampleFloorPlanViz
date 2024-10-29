looker.plugins.visualizations.add({
  options: {
    floor_plan_url: {
      type: "string",
      label: "Floor Plan Image URL",
      default: "https://example.com/floor-plan.jpg"
    },
    circle_radius: {
      type: "number",
      label: "Circle Radius (relative to image)",
      default: 0.01,
      min: 0.001,
      max: 0.05,
      step: 0.001
    },
    circle_opacity: {
      type: "number",
      label: "Circle Opacity",
      default: 0.7,
      min: 0,
      max: 1,
      step: 0.1
    }
  },
  
  create: function(element, config) {
    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.style.width = "100%";
    this.svg.style.height = "100%";
    element.appendChild(this.svg);

    this.imageGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.pointsGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
    this.svg.appendChild(this.imageGroup);
    this.svg.appendChild(this.pointsGroup);
  },

  updateAsync: function(data, element, config, queryResponse, details, done) {
    this.clearErrors();

    if (queryResponse.fields.dimensions.length < 2 || queryResponse.fields.measures.length < 1) {
      this.addError({title: "Invalid Query", message: "This chart requires at least two dimensions (x and y) and one measure (temperature)."});
      return;
    }

    const xField = queryResponse.fields.dimensions[0].name;
    const yField = queryResponse.fields.dimensions[1].name;
    const tempField = queryResponse.fields.measures[0].name;

    // Find min and max temperatures in the dataset
    const temperatures = data.map(row => row[tempField].value);
    const minTemp = Math.min(...temperatures);
    const maxTemp = Math.max(...temperatures);

    function getColor(temperature) {
      const normalizedTemp = (temperature - minTemp) / (maxTemp - minTemp);
      const hue = (1 - normalizedTemp) * 120; // 120 for green (cold), 0 for red (hot)
      return `hsl(${hue}, 100%, 50%)`;
    }

    // Clear existing content
    this.imageGroup.innerHTML = '';
    this.pointsGroup.innerHTML = '';

    // Create image element
    const image = document.createElementNS("http://www.w3.org/2000/svg", "image");
    image.setAttributeNS("http://www.w3.org/1999/xlink", "href", config.floor_plan_url);
    image.setAttribute("width", "100%");
    image.setAttribute("height", "100%");
    this.imageGroup.appendChild(image);

    // Wait for the image to load before rendering points
    image.onload = () => {
      const imageWidth = image.width.baseVal.value;
      const imageHeight = image.height.baseVal.value;

      // Set viewBox to match image dimensions
      this.svg.setAttribute("viewBox", `0 0 ${imageWidth} ${imageHeight}`);

      // Render temperature points
      data.forEach(row => {
        const x = row[xField].value;
        const y = row[yField].value;
        const temp = row[tempField].value;

        const point = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        point.setAttribute("cx", x);
        point.setAttribute("cy", y);
        point.setAttribute("r", config.circle_radius * Math.min(imageWidth, imageHeight));
        point.setAttribute("fill", getColor(temp));
        point.setAttribute("opacity", config.circle_opacity);

        this.pointsGroup.appendChild(point);
      });

      done();
    };

    // Trigger image load
    image.setAttributeNS("http://www.w3.org/1999/xlink", "href", config.floor_plan_url);
  }
});