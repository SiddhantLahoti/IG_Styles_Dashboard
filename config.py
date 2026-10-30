import os

BASE_DIR = os.path.dirname(__file__)

# 1. Dual Excel File Paths
EXCEL_FILE_A = os.path.join(BASE_DIR, "Design Detail & Ana_v2.xlsx")
EXCEL_FILE_B = os.path.join(BASE_DIR, "Design Rm Detail_v2.xlsx")

# --- Image Folder Paths (Keep your actual paths) ---
PRIMARY_IMG_DIR = r"Y:\\"
FALLBACK_IMG_DIR = r"Z:\LD"
IMAGE_CACHE_DIR = os.path.join(BASE_DIR, ".cache_images")

# 2. File A Column Definitions (Master Styles)
COL_STYLE = "Dmcd"              # Col A: Unique Style Number
COL_CTG_DESC = "DmctgDesc"      # Col C: Main Category
COL_SAL_CTG1 = "SalctgDesc"     # Col E: Sales Category 1
COL_SAL_CTG2 = "SalctgDesc2"    # Col G: Sales Category 2
COL_SET_CD = "SetCd"            # Col H: Set Code
COL_BRAND = "Brand"             # Col M: Brand
COL_TONE = "Tone"               # Col Q: Tone
COL_CUSTOMER = "Customer"       # Col N: Customer
COL_DATE = "DmCreatedDt"        # Col I: Creation Date
COL_METAL = "Dmkt"              # Col J: Metal Karat (14K, 18K, S925)
COL_COLOR = "DmCol"             # Col K: Metal Color (R, W, Y)
COL_TOTAL_WT = "Totalwt"        # Col L: Total Weight (g)
COL_CON_BY_DESC = "ConByDesc"
COL_CON_BY_DESC1 = "ConByDesc1"
COL_CREAT_BY_DESC = "CreatByDesc"
COL_CREAT_BY_DESC1 = "CreatByDesc1"
COL_WET_BY_DESC = "WetByDesc"
COL_WET_BY_DESC1 = "WetByDesc1"

# 3. File B Column Definitions (Raw Materials / Stones)
COL_RM_DSG = "Dsg"              # Col A: Style Number
COL_RM_CTG = "Ctg"              # Col B: RM Category (D, C, X)
COL_RM_SUBCTG = "SubCtgDesc"     
COL_RM_LN1 = "Ln1"              # Col E: Sieve Size 1
COL_RM_LN2 = "Ln2"              # Col F: Sieve Size 2
COL_RM_QTY = "RmQty"            # Col G: Stone Quantity
COL_RM_WT = "RmWt"              # Col H: Stone Carat Weight