<!DOCTYPE html>
<html> 
<head> 
  <meta http-equiv="content-type" content="text/html; charset=UTF-8" /> 
  <title>Google Maps Multiple Markers</title> 
  <script src="https://maps.googleapis.com/maps/api/js?key=<?php echo getenv('GOOGLE_MAPS_API_KEY'); ?>" 
          type="text/javascript"></script>
</head> 
<body>
  <div id="map" style="width: 100%; height: 600px;"></div>

  <script type="text/javascript">
    var map;
    var locations = JSON.parse('<?php echo ($markers); ?>');
   if(locations.length==0) 
   map = new google.maps.Map(document.getElementById('map'), {
      zoom: 16,
      center: new google.maps.LatLng(-6.17510967952016, 106.82712676050913),
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });
   else
  
    
     map = new google.maps.Map(document.getElementById('map'), {
      zoom: 12,
      center: new google.maps.LatLng(locations[0][1], locations[0][2]),
      mapTypeId: google.maps.MapTypeId.ROADMAP
    });
    
    var infowindow = new google.maps.InfoWindow();
    var infoWindowContent = JSON.parse('<?php echo ($infowindow); ?>');       
    var marker, i;
    //var icons="<?php echo base_url('uploads/ev2.png'); ?>";
    const icons = {
    url: "<?php echo base_url('uploads/ev2.png'); ?>", // url
    scaledSize: new google.maps.Size(30, 30), // scaled size
    origin: new google.maps.Point(0,0), // origin
    anchor: new google.maps.Point(0, 0) // anchor
};
    for (i = 0; i < locations.length; i++) {  
      marker = new google.maps.Marker({
        position: new google.maps.LatLng(locations[i][1], locations[i][2]),
        map: map,
        title: locations[i][0],
        icon: icons
      });
      
      google.maps.event.addListener(marker, 'click', (function(marker, i) {
        return function() {
          infowindow.setContent(infoWindowContent[i][0]);
          infowindow.open(map, marker);
        }
      })(marker, i));
    }
  </script>
</body>
</html>