


class LessonInnerData(BaseModel):
    number: int
    subject: str
    teacher: str
    room: str
    type: str

class LessonDetails(BaseModel):
    group: str
    building: str
    day: str
    lessonNumber: int
    data: LessonInnerData

class LogEntry(BaseModel):
    id: str
    timestamp: datetime
    user: str
    action: str
    details: LessonDetails

class Journal(BaseModel):
    entries: List[LogEntry]

class Lesson(BaseModel):
    number: int
    subject: str
    teacher: str
    room: str
    type: str

class DaySchedule(BaseModel):
    day: str
    lessons: List[Lesson]

# Сложный тип для расписания: Dict[Группа, Dict[Корпус, List[Дни]]]
ScheduleAdapter = TypeAdapter(Dict[str, Dict[str, List[DaySchedule]]])

def parse_journal(json_data) -> Journal:
    journal = Journal.model_validate(json_data) 
    return journal

def parse_schedule(json_data) -> Dict[str, Dict[str, List[DaySchedule]]]:
    return ScheduleAdapter.validate_python(json_data)