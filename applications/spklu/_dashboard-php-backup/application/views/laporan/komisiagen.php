<style>

#right{float:right}

.right {
                text-align: right;
            }
			.center {
                text-align: center;
            }
</style>

<div class="msg" style="display:none;">
  <?php  echo @$this->session->flashdata('msg'); ?>
</div>

<div class="box">
  
  <!-- /.box-header -->
  <div class="box-body">
  
   <label class="radio-inline"><input type="radio" name="optbayar" checked="checked" value="-1">All</label>
  <label class="radio-inline"><input type="radio" name="optbayar" value="1">Dibayar     </label>
  <label class="radio-inline"><input type="radio" name="optbayar" value="0">Belum dibayar</label>
  <br><br>
  
   <div class="form-group row">
                    <label for="" class="col-md-2 col-form-label">Bulan</label>
                    <div class="col-md-2">
                        <select name="txtbulan" id="txtbulan" class="form-control" data-placeholder="Pilih Bulan" onchange="getdata()" required>
                          
                           
                        </select>
                    </div>
					 <label for="" class="col-md-2 col-form-label">Tahun</label>
                    <div class="col-md-2">
                        <select name="txttahun" id="txttahun" class="form-control" data-placeholder="Pilih Tahun" onchange="getdata()" required>
                          
                           
                        </select>
                    </div>
                </div>

	  <div class="table-responsive" style="min-height: 500px;">
	  	
    <br><table id="list-data" class="table table-bordered table-striped">
      <thead>
        <tr>
          
          <th>Agen</th>
		  <th>No.HP</th>
          <th>Jumlah Transaksi</th>
		  <th>Total</th>
		   <th>Komisi</th>
		   
		   
          <th>Aksi</th>
         <th>idagen</th>
        </tr>
      </thead>
     
    </table>
	</div>
  </div>
</div>

 
  

<div id="tempat-modal"></div>

<script type="text/javascript">
var _idubah=0;
var statuslaundry=-1;
var statusbayar=-1;
var bulan=["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
    $(document).ready(function() {
		 var html = "";
		var ket="";
		const d = new Date();
		let month = d.getMonth()+1;
		let year = d.getFullYear();
		
							for(i=1; i<=12; i++){
								
								if(i==month) ket="selected";
								
								
                            html += '<option value='+i+' '+ ket +'>'+bulan[(i-1)]+'</option>';
							ket="";
							
							
						
						}
					
		
		$('#txtbulan').html(html);
		html="";
		for(i=2021; i<=2100; i++){
								
								if(i==year) ket="selected";
								
								
                            html += '<option value='+i+' '+ ket +'>'+i+'</option>';
							ket="";
							
							
						
						}	
			$('#txttahun').html(html);
			document.querySelector("input[value='"+statuslaundry+"']").checked = true;
			//document.querySelector("input[value='"+statusbayar+"']").checked = true;
		getdata();
	});
	
	
	
		$('input:radio[name="optradio"]').change(
    function(){
        if ($(this).is(':checked')) {
			statuslaundry=$(this).val();
			getdata();
        }
    });
	
	$('input:radio[name="optbayar"]').change(
    function(){
        if ($(this).is(':checked')) {
			statusbayar=$(this).val();
			getdata();
        }
    });
	
	
	
	
	function getdata(){
		
		var _bulan=$('#txtbulan').val();
		var _tahun=$('#txttahun').val();
		var datatable=   $('#list-data').DataTable( {
      dom: 'Blfrtip',
        buttons: [
        'copy', 'excel', 'pdf', 'csv'
    ],
      lengthMenu: [
            [10, 30, 50, -1],
            [10, 30, 50, 'All'],
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
	
	 {targets: [-4,-3],
         className: 'right'
     },
	  {targets: [-1,-2],
         visible: false
     },
	 ],
    "ordering": true,
    "searching": true,
    "serverSide": true,
	"bDestroy": true,
    
 
  "ajax":{
          url :"<?php echo base_url('laporan/komisiagenjson'); ?>", // json datasource
          type: "post",
		    data : {status_laundry: statuslaundry,status_bayar: statusbayar,bulan:_bulan,tahun:_tahun},
			  // method  , by default get
          
        },
		
		"columns": [
			
			{ "data": "nama_agen"},
			{ "data": "no_hp"},
			{ "data": "jum_transaksi"},
			{ "data": "total"},
			{ "data": "komisi"},
			
			{ "data": "aksi"},
			{ "data": "id"},
			
		]
  
  });
 
	}
	

</script>
