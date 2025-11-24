import sys
from loguru import logger


def setup_logging():
    """
    Configure Loguru to output structured JSON logs.
    """
    import json
    
    def sink(message):
        record = message.record
        log_entry = {
            "timestamp": record["time"].isoformat(),
            "level": record["level"].name,
            "message": record["message"],
            "logger": record["name"],
            "extra": record["extra"],
        }
        if record["exception"]:
            log_entry["exception"] = str(record["exception"])
            
        print(json.dumps(log_entry))

    logger.remove()
    logger.add(
        sink,
        serialize=False, # We are doing our own serialization
        enqueue=True,
        backtrace=True,
        diagnose=True,
    )
