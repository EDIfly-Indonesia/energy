<style>
 div.dt-buttons {
   
    margin-right: 20px;
}
.right {
                text-align: right;
            }
</style>

<div class="msg" style="display:none;">
  <?php  echo @$this->session->flashdata('msg'); ?>
</div>

<div class="box">
  
  <!-- /.box-header -->
  <div class="box-body">
   <?php
			if($access->c) {?>
  	 <!--<div class="btn-group" id="right">
						<a href="javascript:void(0);" class="btn btn-primary float-right" onclick="tambahdata();">Tambah</a>
						
	</div><br><br>-->
	<?php }?>
	  <div class="table-responsive" style="min-height: 500px;">
    <table id="list-data" class="table table-bordered table-striped">
      <thead>
        <tr>
          <th>ChargeBox ID</th>
          <th>Connector ID</th>
          <th>Waktu</th>
		  <th>Status</th>
          <th>Error Code</th>
         <th>Info</th>
		     
        </tr>
      </thead>
     
    </table>
	</div>
  </div>
</div>

 
  

<div id="tempat-modal"></div>

<script type="text/javascript">
var _idubah=0;
var _idalamat=0;
var tenantlama=null;
    $(document).ready(function() {
     
		getdata("<?=  base64_decode($id)?>");
    
	});
	
	

  
	function getdata(chargebox){
		
		var datatable=   $('#list-data').DataTable( {
       dom: 'Blfrtip',
        buttons: [
        //  'pdfHtml5','excelHtml5',
           
            { extend: 'excel', 
              footer: true,
              //"text": '<button class="btn"><i class="fa fa-file-excel-o" style="color: green;"></i>  Excel</button>',
              "titleAttr": 'Excel',
              filename : "Logs",
			  exportOptions: {
                    columns: [ 0,1,2,3,4,5]
                }		
              },
              
           
      
        
    ],
        "processing" : true,
        "oLanguage": {
                "sLengthMenu": "Tampilkan _MENU_ data per halaman",
                "sSearch": "Pencarian: ",
                "sZeroRecords": "Maaf, tidak ada data yang ditemukan",
               "sInfo": "Menampilkan _START_ s/d _END_ dari _TOTAL_ data",
				//"sInfo": "",
                "sInfoEmpty": "Menampilkan 0 s/d 0 dari 0 data",
                "sInfoFiltered": "(di filter dari _MAX_ total data)",
                "oPaginate": {
                    "sFirst": "<<",
                    "sLast": ">>",
                    "sPrevious": "<",
                    "sNext": ">"
               }
            },
  columnDefs: [{
        targets: [0],
        orderable: false
     },
	 
	 ],
    "ordering": true,
    "searching": true,
    "serverSide": true,
	"bDestroy": true,
	"order": [2,'desc'],
    
 
  "ajax":{
          url :"<?php echo base_url('chargebox/datalogsjson/'); ?>"+ chargebox, // json datasource
          type: "post",
			  // method  , by default get
          
        },

		"columns": [
			
			
			{ "data": "chargebox_id"},
			{ "data": "connector_id"},
			
			{ "data": "waktu"},

			{ "data": "status"},
			{ "data": "error_code"},
			{ "data": "info"},
			
			
			
		]
  
  });
 
	}
	
	
	
</script>
