import masterUrl from '../data/master.csv?url';

export default function About() {
  return (
    <div class="page">
      <h1>About</h1>
      <p>This webpage is an open-source map (MIT License), utilizing OpenStreetMap, Leaflet, and Preact. The intention of this site is to help educate and inform about flooding and flooding history so that we can better prepare our communities and selves in a time of rapid climate changes. </p>
      <p>Understanding flooding is crucial. Flash flooding, extreme weather, as well as tsunamis pose risks to life, property, and infrastructure. These risks are unevenly distributed, more heavily affecting those who are unable to move, those in rural communities with little flood prevention or warning infrastructure, and those closer to the sea.</p>
      <p>Our master data set is available for download <a href={masterUrl} download="openPrincetonFloodMap-master.csv">here</a>.</p>
    </div>
  );
}
