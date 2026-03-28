
# Complete End-to-End Implementation Workflow

## From Zero to Production Microstructure Trading System

---

## Phase 1: Hardware and Infrastructure Setup

### Computer Build Specification

For this specific strategy, you need a system optimized for low-latency data processing with GPU acceleration for parallel signal computation. Here is the exact build:

**Primary Workstation:**

```
CPU:        AMD Ryzen 7 5800X (8 cores, 16 threads)
            Why: Strong single-thread for network/strategy loop
            
RAM:        32 GB DDR4 3600MHz
            Why: Large tick buffers, historical data in memory
            
GPU:        AMD RX 6700 XT (12GB VRAM)
            Why: OpenCL native support, sufficient compute units
            Alternative: NVIDIA RTX 3060 12GB (use CUDA instead)
            
Storage:    500GB NVMe SSD (Samsung 970 EVO Plus)
            Why: Fast logging, tick data storage
            
Network:    Intel I225-V 2.5GbE NIC
            Why: Lower interrupt latency than Realtek
            
OS:         Ubuntu 22.04 LTS Server (minimal install)
            Why: Kernel tuning, no GUI overhead
```

**Why not a bigger GPU?**

Your strategy processes one instrument with roughly 40-50 ticks per second. The GPU is used for parallel signal computation across rolling windows, not massive matrix operations. A mid-range GPU is more than sufficient, and the money saved is better allocated to trading capital.

**Why AMD CPU?**

The Ryzen 5800X has excellent single-thread performance which matters for your sequential network processing loop. Intel 12th/13th gen is also fine. The key is high single-core clock speed, not core count.

---

### Operating System Configuration

After installing Ubuntu 22.04 Server:

**Step 1: Disable unnecessary services**

```bash
sudo systemctl disable snapd
sudo systemctl disable cups
sudo systemctl disable bluetooth
sudo systemctl disable avahi-daemon
sudo systemctl disable ModemManager
```

**Step 2: Install required packages**

```bash
sudo apt update
sudo apt install -y \
    build-essential \
    gcc-12 \
    clang-14 \
    cmake \
    git \
    ocl-icd-opencl-dev \
    opencl-headers \
    clinfo \
    libssl-dev \
    libwebsockets-dev \
    libjson-c-dev \
    linux-tools-common \
    linux-tools-generic \
    numactl \
    hwloc \
    perf \
    htop
```

**Step 3: Install GPU drivers and OpenCL runtime**

For AMD GPU:

```bash
wget https://repo.radeon.com/amdgpu-install/latest/ubuntu/jammy/amdgpu-install_5.4.50400-1_all.deb
sudo dpkg -i amdgpu-install_5.4.50400-1_all.deb
sudo amdgpu-install --usecase=opencl
```

For NVIDIA GPU:

```bash
sudo apt install nvidia-driver-535
sudo apt install nvidia-opencl-dev
```

Verify OpenCL works:

```bash
clinfo
```

You should see your GPU listed with compute units and memory.

**Step 4: Kernel tuning for low latency**

Create `/etc/sysctl.d/99-trading.conf`:

```bash
# Reduce network latency
net.core.rmem_max = 16777216
net.core.rmem_default = 1048576
net.core.netdev_max_backlog = 5000
net.ipv4.tcp_nodelay = 1
net.ipv4.tcp_low_latency = 1

# Reduce scheduling latency
kernel.sched_min_granularity_ns = 100000
kernel.sched_wakeup_granularity_ns = 50000

# Disable swap
vm.swappiness = 0
```

Apply:

```bash
sudo sysctl --system
```

**Step 5: CPU isolation for trading threads**

Edit `/etc/default/grub`:

```bash
GRUB_CMDLINE_LINUX="isolcpus=6,7 nohz_full=6,7 rcu_nocbs=6,7"
```

Update and reboot:

```bash
sudo update-grub
sudo reboot
```

This reserves CPU cores 6 and 7 exclusively for your trading threads. The OS scheduler won't place any other work on these cores.

---

## Phase 2: Project Structure

Create the complete project layout:

```bash
mkdir -p trading_system/{src,include,kernels,config,logs,data,tests,scripts}
```

```
trading_system/
├── src/
│   ├── main.c
│   ├── network.c
│   ├── orderbook.c
│   ├── features.c
│   ├── queue_model.c
│   ├── execution.c
│   ├── risk.c
│   ├── logger.c
│   ├── opencl_engine.c
│   ├── spsc_queue.c
│   └── config.c
├── include/
│   ├── network.h
│   ├── orderbook.h
│   ├── features.h
│   ├── queue_model.h
│   ├── execution.h
│   ├── risk.h
│   ├── logger.h
│   ├── opencl_engine.h
│   ├── spsc_queue.h
│   ├── config.h
│   └── types.h
├── kernels/
│   ├── ofi_kernel.cl
│   ├── cancel_kernel.cl
│   └── aggression_kernel.cl
├── config/
│   ├── system_config.json
│   └── risk_params.json
├── logs/
├── data/
├── tests/
│   ├── test_orderbook.c
│   ├── test_features.c
│   ├── test_queue_model.c
│   └── test_spsc.c
├── scripts/
│   ├── start.sh
│   ├── stop.sh
│   └── analyze.py
├── CMakeLists.txt
└── README.md
```

---

## Phase 3: Core Data Types

### `include/types.h`

```c
#ifndef TYPES_H
#define TYPES_H

#include <stdint.h>
#include <stdbool.h>
#include <time.h>

/* ============================================================
 * CONFIGURATION CONSTANTS
 * ============================================================ */

#define MAX_DEPTH_LEVELS    5
#define MAX_TICK_HISTORY    2048    /* Power of 2 for ring buffer */
#define MAX_TRADE_HISTORY   1024
#define MAX_CANCEL_HISTORY  512
#define SYMBOL_LENGTH       32
#define LOT_SIZE            25      /* Nifty options lot size */

/* ============================================================
 * TIMESTAMP - Nanosecond precision
 * ============================================================ */

typedef struct {
    int64_t epoch_ns;    /* Nanoseconds since epoch */
} Timestamp;

static inline Timestamp now_timestamp(void) {
    struct timespec ts;
    clock_gettime(CLOCK_MONOTONIC, &ts);
    Timestamp t;
    t.epoch_ns = (int64_t)ts.tv_sec * 1000000000LL + ts.tv_nsec;
    return t;
}

static inline double timestamp_diff_ms(Timestamp a, Timestamp b) {
    return (double)(a.epoch_ns - b.epoch_ns) / 1000000.0;
}

/* ============================================================
 * PRICE TYPE - Fixed point to avoid floating point issues
 * ============================================================ */

/* Prices stored as integer ticks
 * 1 tick = ₹0.05
 * So 102.00 = 2040 ticks
 * This eliminates all floating point comparison bugs */

typedef int32_t Price;

#define TICK_SIZE_PAISE  5          /* 0.05 rupees = 5 paise */
#define PRICE_TO_TICKS(p)  ((int32_t)((p) * 100 / TICK_SIZE_PAISE))
#define TICKS_TO_PRICE(t)  ((double)(t) * TICK_SIZE_PAISE / 100.0)

/* ============================================================
 * ORDER BOOK LEVEL
 * ============================================================ */

typedef struct {
    Price   price;
    int32_t size;       /* Number of lots */
    int32_t order_count; /* Number of orders at this level */
} BookLevel;

/* ============================================================
 * ORDER BOOK SNAPSHOT
 * ============================================================ */

typedef struct {
    BookLevel   bids[MAX_DEPTH_LEVELS];
    BookLevel   asks[MAX_DEPTH_LEVELS];
    int         bid_levels;     /* Active bid levels */
    int         ask_levels;     /* Active ask levels */
    Timestamp   timestamp;
    uint64_t    sequence;       /* Exchange sequence number */
} OrderBook;

/* ============================================================
 * TICK UPDATE - What arrives from the feed
 * ============================================================ */

typedef enum {
    TICK_DEPTH_UPDATE,
    TICK_TRADE,
    TICK_HEARTBEAT
} TickType;

typedef enum {
    SIDE_BUY,
    SIDE_SELL,
    SIDE_UNKNOWN
} Side;

typedef struct {
    TickType    type;
    Timestamp   exchange_time;
    Timestamp   local_time;     /* When we received it */
    
    /* For depth updates */
    OrderBook   book;
    
    /* For trades */
    Price       trade_price;
    int32_t     trade_size;
    Side        aggressor;      /* Who initiated the trade */
    
    uint64_t    sequence;
} Tick;

/* ============================================================
 * FEATURES - Computed signals
 * ============================================================ */

typedef struct {
    /* Delta OFI */
    double      ofi_raw;
    double      ofi_normalized;
    
    /* Cancel intensity */
    double      cancel_ratio;
    int32_t     cancels_observed;
    int32_t     cancels_baseline;
    
    /* Trade aggression */
    int32_t     buy_trades;
    int32_t     sell_trades;
    double      aggression_score;
    
    /* Book state */
    double      spread;         /* In ticks */
    double      bid_depth;      /* Total bid size */
    double      ask_depth;      /* Total ask size */
    double      microprice;     /* Size-weighted mid */
    
    /* Queue info */
    int32_t     queue_ahead_bid;
    int32_t     queue_ahead_ask;
    
    Timestamp   computed_at;
    bool        valid;          /* False during warm-up */
} Features;

/* ============================================================
 * SIGNAL DECISION
 * ============================================================ */

typedef enum {
    SIGNAL_NONE,
    SIGNAL_BUY,
    SIGNAL_SELL
} SignalType;

typedef struct {
    SignalType  type;
    double      confidence;     /* 0.0 to 1.0 */
    double      expected_fill_time_ms;
    double      fill_probability;
    Price       target_price;
    Timestamp   generated_at;
} Signal;

/* ============================================================
 * ORDER
 * ============================================================ */

typedef enum {
    ORDER_PENDING,
    ORDER_OPEN,
    ORDER_FILLED,
    ORDER_CANCELLED,
    ORDER_REJECTED
} OrderStatus;

typedef struct {
    uint64_t    order_id;
    Side        side;
    Price       price;
    int32_t     quantity;
    OrderStatus status;
    Timestamp   sent_at;
    Timestamp   ack_at;
    Timestamp   filled_at;
    Price       fill_price;
} Order;

/* ============================================================
 * POSITION
 * ============================================================ */

typedef struct {
    Side        side;           /* Current position direction */
    Price       entry_price;
    int32_t     quantity;
    Timestamp   entry_time;
    bool        active;
} Position;

/* ============================================================
 * TRADE RECORD - For logging and analysis
 * ============================================================ */

typedef struct {
    uint64_t    trade_id;
    Price       entry_price;
    Price       exit_price;
    Side        direction;
    int32_t     quantity;
    
    /* Timing */
    Timestamp   signal_time;
    Timestamp   order_sent_time;
    Timestamp   fill_time;
    Timestamp   exit_time;
    
    /* Queue metrics */
    int32_t     queue_ahead_at_entry;
    double      expected_fill_time_ms;
    double      actual_fill_time_ms;
    
    /* Post-fill analysis */
    double      post_fill_drift;    /* Price move after fill */
    
    /* Financial */
    double      gross_pnl;
    double      commission;
    double      net_pnl;
    
    /* Signal state at entry */
    double      ofi_at_entry;
    double      cancel_ratio_at_entry;
    double      aggression_at_entry;
} TradeRecord;

/* ============================================================
 * SESSION BASELINE - Calibration data
 * ============================================================ */

typedef struct {
    double      avg_trade_rate;     /* Trades per second */
    double      avg_cancel_rate;    /* Cancels per second */
    double      avg_spread;         /* Average spread in ticks */
    double      avg_depth;          /* Average book depth */
    double      avg_volatility;     /* Tick-to-tick price variance */
    int32_t     sample_count;
    bool        calibrated;
    Timestamp   calibration_time;
} SessionBaseline;

/* ============================================================
 * RISK STATE
 * ============================================================ */

typedef struct {
    double      daily_pnl;
    double      max_drawdown;
    double      current_drawdown;
    int32_t     trades_today;
    int32_t     consecutive_losses;
    int32_t     wins_today;
    int32_t     losses_today;
    double      max_daily_loss;     /* Kill switch threshold */
    int32_t     max_daily_trades;
    bool        trading_allowed;
    Timestamp   last_trade_time;
} RiskState;

/* ============================================================
 * SYSTEM CONFIGURATION
 * ============================================================ */

typedef struct {
    /* Network */
    char        feed_host[64];
    int         feed_port;
    char        order_host[64];
    int         order_port;
    char        api_key[128];
    char        api_secret[128];
    
    /* Strategy parameters */
    double      ofi_threshold;          /* Minimum OFI to trade */
    double      aggression_threshold;   /* Minimum aggression */
    double      cancel_ratio_max;       /* Maximum cancel ratio */
    double      max_fill_time_ms;       /* Maximum acceptable fill time */
    double      min_fill_probability;   /* Minimum fill probability */
    
    /* Risk parameters */
    double      max_daily_loss;
    int32_t     max_daily_trades;
    int32_t     max_consecutive_losses;
    double      max_position_size;
    double      stop_loss_ticks;
    
    /* Warm-up */
    int32_t     warmup_duration_sec;
    
    /* Timing */
    int32_t     post_fill_monitor_ms;
    int32_t     order_timeout_ms;
    
    /* OpenCL */
    int         opencl_platform_id;
    int         opencl_device_id;
    int         feature_window_size;
    
    /* CPU affinity */
    int         network_thread_cpu;
    int         strategy_thread_cpu;
} SystemConfig;

#endif /* TYPES_H */
```

This type system is critical. Every component communicates through these structures. No ambiguity about what data looks like anywhere in the system.

The fixed-point price representation deserves special attention. Using floating point for prices causes subtle comparison bugs. The price 102.05 might be stored as 102.04999999... which breaks equality checks. By converting to integer ticks (102.05 becomes 2041 ticks), all price comparisons are exact integer operations.

---

## Phase 4: Lock-Free SPSC Queue

This is the communication backbone between your network thread and strategy thread.

### `include/spsc_queue.h`

```c
#ifndef SPSC_QUEUE_H
#define SPSC_QUEUE_H

#include <stdatomic.h>
#include <stdbool.h>
#include <string.h>
#include "types.h"

/* 
 * Single-Producer Single-Consumer Lock-Free Queue
 * 
 * Why this design:
 * - Network thread is the ONLY producer
 * - Strategy thread is the ONLY consumer
 * - No locks needed (lock-free by design)
 * - Cache-line padding prevents false sharing
 * 
 * The queue size MUST be a power of 2.
 * This allows using bitwise AND instead of modulo
 * for index wrapping, which is significantly faster.
 */

#define SPSC_QUEUE_SIZE  4096   /* Must be power of 2 */
#define SPSC_QUEUE_MASK  (SPSC_QUEUE_SIZE - 1)

/* Cache line size on x86-64 */
#define CACHE_LINE_SIZE  64

typedef struct {
    /* Producer side - only written by network thread */
    /* Padded to its own cache line to prevent false sharing */
    alignas(CACHE_LINE_SIZE) atomic_uint_fast64_t write_pos;
    char _pad1[CACHE_LINE_SIZE - sizeof(atomic_uint_fast64_t)];
    
    /* Consumer side - only written by strategy thread */
    alignas(CACHE_LINE_SIZE) atomic_uint_fast64_t read_pos;
    char _pad2[CACHE_LINE_SIZE - sizeof(atomic_uint_fast64_t)];
    
    /* Shared data buffer */
    /* Each Tick is relatively large, so we store them directly */
    Tick buffer[SPSC_QUEUE_SIZE];
    
    /* Overflow counter for monitoring */
    alignas(CACHE_LINE_SIZE) atomic_uint_fast64_t overflow_count;
    
} SPSCQueue;

/* Initialize queue - call before starting threads */
static inline void spsc_init(SPSCQueue *q) {
    atomic_store_explicit(&q->write_pos, 0, memory_order_relaxed);
    atomic_store_explicit(&q->read_pos, 0, memory_order_relaxed);
    atomic_store_explicit(&q->overflow_count, 0, memory_order_relaxed);
    memset(q->buffer, 0, sizeof(q->buffer));
}

/* 
 * Push a tick into the queue (called by network thread ONLY)
 * Returns: true if successful, false if queue is full
 */
static inline bool spsc_push(SPSCQueue *q, const Tick *tick) {
    uint64_t write = atomic_load_explicit(&q->write_pos, 
                                           memory_order_relaxed);
    uint64_t read  = atomic_load_explicit(&q->read_pos, 
                                           memory_order_acquire);
    
    /* Check if queue is full */
    if (write - read >= SPSC_QUEUE_SIZE) {
        atomic_fetch_add_explicit(&q->overflow_count, 1, 
                                   memory_order_relaxed);
        return false;
    }
    
    /* Copy tick into buffer */
    q->buffer[write & SPSC_QUEUE_MASK] = *tick;
    
    /* Memory fence: ensure tick data is written before 
     * write_pos becomes visible to consumer */
    atomic_store_explicit(&q->write_pos, write + 1, 
                           memory_order_release);
    
    return true;
}

/* 
 * Pop a tick from the queue (called by strategy thread ONLY)
 * Returns: true if a tick was available, false if empty
 */
static inline bool spsc_pop(SPSCQueue *q, Tick *tick) {
    uint64_t read  = atomic_load_explicit(&q->read_pos, 
                                           memory_order_relaxed);
    uint64_t write = atomic_load_explicit(&q->write_pos, 
                                           memory_order_acquire);
    
    /* Check if queue is empty */
    if (read >= write) {
        return false;
    }
    
    /* Copy tick from buffer */
    *tick = q->buffer[read & SPSC_QUEUE_MASK];
    
    /* Memory fence: ensure tick data is read before 
     * read_pos advances */
    atomic_store_explicit(&q->read_pos, read + 1, 
                           memory_order_release);
    
    return true;
}

/* Get current queue depth (approximate, used for monitoring) */
static inline uint64_t spsc_size(const SPSCQueue *q) {
    uint64_t write = atomic_load_explicit(&q->write_pos, 
                                           memory_order_relaxed);
    uint64_t read  = atomic_load_explicit(&q->read_pos, 
                                           memory_order_relaxed);
    return write - read;
}

#endif /* SPSC_QUEUE_H */
```

**Why this implementation matters:**

The cache line padding between `write_pos` and `read_pos` prevents false sharing. Without this, both atomic variables would sit on the same cache line, causing the CPU to bounce the cache line between cores on every read/write. This single optimization can improve throughput by 10-50x on modern CPUs.

The power-of-2 size enables `write & SPSC_QUEUE_MASK` instead of `write % SPSC_QUEUE_SIZE`. Bitwise AND takes 1 CPU cycle; modulo takes 20-40 cycles. Over millions of operations per second, this adds up.

---
